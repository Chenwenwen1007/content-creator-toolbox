"""
统计API路由
提供访问计数和工具使用计数接口
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from server.database import get_db
from server.services import stats_service

router = APIRouter(prefix="/api/stats", tags=["stats"])


class HomeViewResponse(BaseModel):
    """首页访问响应"""
    counted: bool
    total_home_views: int


class ToolUsageResponse(BaseModel):
    """工具使用响应"""
    success: bool
    tool_id: str
    count: int


class AllStatsResponse(BaseModel):
    """所有统计响应"""
    total_home_views: int
    total_tool_usages: int
    tool_stats: dict[str, int]


@router.post("/home-view", response_model=HomeViewResponse, summary="记录首页访问")
def record_home_view(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    记录首页访问
    同一IP+Cookie在3小时内只计数一次
    返回是否计数和当前总访问次数
    """
    # 获取客户端IP
    ip = request.client.host if request.client else "unknown"
    # 从请求头获取X-Forwarded-For（如果有反向代理）
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()

    cookie_id = request.cookies.get("toolbox_visitor_id")
    user_agent = request.headers.get("User-Agent")

    counted, total_count = stats_service.record_home_view(db, ip, cookie_id, user_agent)
    return {"counted": counted, "total_home_views": total_count}


@router.post("/tool-usage/{tool_id}", response_model=ToolUsageResponse, summary="记录工具使用")
def record_tool_usage(
    tool_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    记录工具使用
    每次调用都计数
    返回是否成功、工具ID和当前使用次数
    """
    ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()

    count = stats_service.record_tool_usage(db, tool_id, ip)
    return {"success": True, "tool_id": tool_id, "count": count}


@router.get("/all", response_model=AllStatsResponse, summary="获取所有统计数据")
def get_all_stats(db: Session = Depends(get_db)):
    """获取首页访问次数、工具总使用次数和每个工具的使用次数"""
    return stats_service.get_all_stats(db)
