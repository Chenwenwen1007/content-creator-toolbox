"""
数据库配置模块
使用SQLite存储访问计数和工具使用统计
"""
from sqlalchemy import create_engine, Column, String, Integer, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path
from datetime import datetime

# 确保data目录存在
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# SQLite数据库路径
DB_PATH = DATA_DIR / "stats.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 创建数据库引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# 会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 模型基类
Base = declarative_base()


class PageView(Base):
    """页面访问统计表"""
    __tablename__ = "page_views"

    id = Column(Integer, primary_key=True, index=True)
    page = Column(String(50), nullable=False, index=True, comment="页面标识，home为首页")
    ip = Column(String(50), nullable=False, comment="访问者IP")
    cookie_id = Column(String(100), nullable=True, comment="Cookie标识")
    user_agent = Column(String(500), nullable=True, comment="浏览器UA")
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)


class ToolUsage(Base):
    """工具使用统计表"""
    __tablename__ = "tool_usage"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(String(50), nullable=False, index=True, comment="工具ID")
    ip = Column(String(50), nullable=False, comment="使用者IP")
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)


class ToolStats(Base):
    """工具使用次数汇总表（方便快速查询）"""
    __tablename__ = "tool_stats"

    tool_id = Column(String(50), primary_key=True, index=True, comment="工具ID")
    count = Column(Integer, default=0, nullable=False, comment="使用次数")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


class TotalStats(Base):
    """全局统计汇总表"""
    __tablename__ = "total_stats"

    key = Column(String(50), primary_key=True, index=True, comment="统计键")
    value = Column(Integer, default=0, nullable=False, comment="统计值")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


def init_db():
    """初始化数据库表"""
    Base.metadata.create_all(bind=engine)

    # 初始化首页访问计数为0
    db = SessionLocal()
    try:
        home_views = db.query(TotalStats).filter(TotalStats.key == "home_views").first()
        if not home_views:
            db.add(TotalStats(key="home_views", value=0))
            db.commit()
    finally:
        db.close()


def get_db():
    """获取数据库会话依赖"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
