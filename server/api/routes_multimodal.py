import json
import re
from typing import List

import httpx
from fastapi import APIRouter, Depends

from server.schemas.request import MultimodalExtractRequest
from server.schemas.response import ApiResponse, MultimodalExtractPayload
from server.utils.exceptions import MultimodalError

router = APIRouter(prefix="/api/multimodal", tags=["多模态"])


SYSTEM_PROMPT = """你是一个专业的视频内容分析助手。请根据用户提供的视频帧图片，分析视频内容，提取视频文案。

要求返回严格的 JSON 格式，包含以下三个字段：
1. summary: 一句话摘要，不超过50字
2. key_points: 关键要点列表，3-5条
3. full_text: 尽可能完整的视频文案/台词内容

请直接返回 JSON，不要包含任何解释文字或 markdown 代码块标记。"""


def _parse_json_response(text: str) -> dict:
    """解析模型返回的 JSON 文本，支持代码块包裹的情况

    Args:
        text: 模型返回的原始文本

    Returns:
        解析后的 JSON 字典

    Raises:
        MultimodalError: 解析失败时抛出
    """
    cleaned = text.strip()
    # 移除 markdown 代码块标记
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise MultimodalError(
            code="PARSE_RESPONSE_ERROR",
            message="模型返回内容解析失败",
            status_code=502,
            details={"raw_text": text[:500], "error": str(e)},
        )


def _build_doubao_messages(frames: List[str]) -> List[dict]:
    """构建豆包模型的 messages 格式（responses.create 接口）

    Args:
        frames: base64 帧图片列表

    Returns:
        消息列表
    """
    content = []
    for frame_b64 in frames:
        img_url = frame_b64 if frame_b64.startswith("http") else f"data:image/jpeg;base64,{frame_b64}"
        content.append({
            "type": "input_image",
            "image_url": img_url,
        })
    content.append({
        "type": "input_text",
        "text": SYSTEM_PROMPT + "\n\n请分析以上视频帧图片，提取视频文案内容。",
    })
    return [{"role": "user", "content": content}]


def _build_chat_messages(frames: List[str]) -> List[dict]:
    """构建 OpenAI 兼容格式的 chat messages

    Args:
        frames: base64 帧图片列表

    Returns:
        消息列表
    """
    content = [{"type": "text", "text": SYSTEM_PROMPT + "\n\n请分析以下视频帧图片，提取视频文案内容。"}]
    for frame_b64 in frames:
        img_url = frame_b64 if frame_b64.startswith("http") else f"data:image/jpeg;base64,{frame_b64}"
        content.append({
            "type": "image_url",
            "image_url": {"url": img_url},
        })
    return [{"role": "user", "content": content}]


async def _call_doubao_api(
    base_url: str,
    api_key: str,
    model_name: str,
    frames: List[str],
) -> str:
    """调用豆包多模态 API（responses.create 接口）

    Args:
        base_url: API 基础地址
        api_key: API 密钥
        model_name: 模型名称
        frames: 帧图片列表

    Returns:
        模型返回的文本内容

    Raises:
        MultimodalError: 调用失败时抛出
    """
    url = f"{base_url}/responses"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "input": _build_doubao_messages(frames),
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            # 从 responses 格式中提取文本
            output = data.get("output", [])
            text_parts = []
            for item in output:
                if isinstance(item, dict) and item.get("type") == "message":
                    for content_item in item.get("content", []):
                        if isinstance(content_item, dict) and content_item.get("type") == "output_text":
                            text_parts.append(content_item.get("text", ""))
            return "\n".join(text_parts) if text_parts else json.dumps(data, ensure_ascii=False)
    except httpx.HTTPStatusError as e:
        raise MultimodalError(
            code="MODEL_API_ERROR",
            message=f"模型 API 调用失败: {e.response.status_code}",
            status_code=502,
            details={"response": e.response.text[:500]},
        )
    except httpx.RequestError as e:
        raise MultimodalError(
            code="MODEL_REQUEST_ERROR",
            message=f"模型 API 请求异常: {str(e)}",
            status_code=502,
        )


async def _call_chat_completion_api(
    base_url: str,
    api_key: str,
    model_name: str,
    frames: List[str],
) -> str:
    """调用 OpenAI 兼容格式的 chat completions 接口

    Args:
        base_url: API 基础地址
        api_key: API 密钥
        model_name: 模型名称
        frames: 帧图片列表

    Returns:
        模型返回的文本内容

    Raises:
        MultimodalError: 调用失败时抛出
    """
    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": _build_chat_messages(frames),
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices", [])
            if choices and isinstance(choices[0], dict):
                message = choices[0].get("message", {})
                return message.get("content", "")
            return json.dumps(data, ensure_ascii=False)
    except httpx.HTTPStatusError as e:
        raise MultimodalError(
            code="MODEL_API_ERROR",
            message=f"模型 API 调用失败: {e.response.status_code}",
            status_code=502,
            details={"response": e.response.text[:500]},
        )
    except httpx.RequestError as e:
        raise MultimodalError(
            code="MODEL_REQUEST_ERROR",
            message=f"模型 API 请求异常: {str(e)}",
            status_code=502,
        )


@router.post("/extract-text", response_model=ApiResponse[MultimodalExtractPayload])
async def extract_video_text(req: MultimodalExtractRequest):
    """提取视频文案（多模态分析）

    通过调用大模型多模态能力，分析视频帧图片，提取视频文案内容，
    返回金字塔结构：一句话摘要、关键要点、完整文案。
    """
    # 根据模型 ID 选择调用方式
    if req.model_id == "doubao":
        raw_text = await _call_doubao_api(
            base_url=req.base_url,
            api_key=req.api_key,
            model_name=req.model_name,
            frames=req.frames,
        )
    else:
        raw_text = await _call_chat_completion_api(
            base_url=req.base_url,
            api_key=req.api_key,
            model_name=req.model_name,
            frames=req.frames,
        )

    # 解析 JSON 响应
    result = _parse_json_response(raw_text)

    payload = MultimodalExtractPayload(
        summary=result.get("summary", ""),
        key_points=result.get("key_points", []),
        full_text=result.get("full_text", ""),
    )

    return ApiResponse(data=payload)
