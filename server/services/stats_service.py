"""
统计服务模块
处理页面访问计数和工具使用计数
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from server.database import PageView, ToolUsage, ToolStats, TotalStats

# 首页访问防刷间隔：3小时
HOME_VIEW_COOLDOWN = timedelta(hours=3)


def record_home_view(db: Session, ip: str, cookie_id: str | None, user_agent: str | None) -> tuple[bool, int]:
    """
    记录首页访问
    同一IP+Cookie在3小时内只计数一次
    返回 (是否计数, 当前总访问次数)
    """
    # 查找冷却时间内的访问记录
    cutoff = datetime.now() - HOME_VIEW_COOLDOWN
    existing = db.query(PageView).filter(
        PageView.page == "home",
        PageView.ip == ip,
        PageView.created_at >= cutoff
    )
    if cookie_id:
        existing = existing.filter(PageView.cookie_id == cookie_id)
    existing = existing.first()

    is_new_view = existing is None

    if is_new_view:
        # 记录新访问
        view = PageView(
            page="home",
            ip=ip,
            cookie_id=cookie_id,
            user_agent=user_agent,
        )
        db.add(view)

        # 更新总访问数
        total = db.query(TotalStats).filter(TotalStats.key == "home_views").first()
        if total:
            total.value += 1
        else:
            db.add(TotalStats(key="home_views", value=1))

        db.commit()

    # 返回总访问数
    total = db.query(TotalStats).filter(TotalStats.key == "home_views").first()
    total_count = total.value if total else 0
    return is_new_view, total_count


def get_home_views(db: Session) -> int:
    """获取首页总访问次数"""
    total = db.query(TotalStats).filter(TotalStats.key == "home_views").first()
    return total.value if total else 0


def record_tool_usage(db: Session, tool_id: str, ip: str) -> int:
    """
    记录工具使用
    每次使用都计数（按用户要求）
    返回当前工具使用次数
    """
    # 记录使用日志
    usage = ToolUsage(
        tool_id=tool_id,
        ip=ip,
    )
    db.add(usage)

    # 更新工具统计
    stats = db.query(ToolStats).filter(ToolStats.tool_id == tool_id).first()
    if stats:
        stats.count += 1
    else:
        db.add(ToolStats(tool_id=tool_id, count=1))

    db.commit()

    # 返回最新计数
    stats = db.query(ToolStats).filter(ToolStats.tool_id == tool_id).first()
    return stats.count if stats else 1


def get_tool_stats(db: Session) -> dict[str, int]:
    """获取所有工具的使用次数"""
    stats = db.query(ToolStats).all()
    return {s.tool_id: s.count for s in stats}


def get_total_tool_usages(db: Session) -> int:
    """获取所有工具使用总次数"""
    total = db.query(func.coalesce(func.sum(ToolStats.count), 0)).scalar()
    return int(total) if total else 0


def get_all_stats(db: Session) -> dict:
    """获取所有统计数据（首页+所有工具）"""
    home_views = get_home_views(db)
    tool_stats = get_tool_stats(db)
    total_tool_usages = get_total_tool_usages(db)
    return {
        "total_home_views": home_views,
        "total_tool_usages": total_tool_usages,
        "tool_stats": tool_stats,
    }
