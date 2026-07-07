from typing import List, Literal

from pydantic import BaseModel, Field, field_validator


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Share link or share text.")
    mode: Literal["auto", "native", "third_party"] = Field(
        default="auto",
        description="解析方式: auto=自动(先自有解析，失败时尝试第三方), native=仅自有解析, third_party=仅第三方API",
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("分享文案或链接不能为空。")
        return cleaned


class MultimodalExtractRequest(BaseModel):
    """多模态文案提取请求"""
    video_url: str = Field("", description="视频地址")
    frames: List[str] = Field(..., description="base64 格式的帧图片数组")
    model_id: Literal["doubao", "kimi", "minimax", "gemini"] = Field(..., description="模型ID")
    api_key: str = Field(..., min_length=1, description="API 密钥")
    model_name: str = Field(..., min_length=1, description="模型名称")
    base_url: str = Field(..., min_length=1, description="API 基础 URL")

    @field_validator("frames")
    @classmethod
    def validate_frames(cls, value: List[str]) -> List[str]:
        if len(value) < 1:
            raise ValueError("至少需要 1 帧图片")
        if len(value) > 20:
            raise ValueError("最多支持 20 帧图片")
        return value

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        return value.rstrip("/")
