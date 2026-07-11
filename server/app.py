import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from server.api.routes_health import router as health_router
from server.api.routes_multimodal import router as multimodal_router
from server.api.routes_parse import router as parse_router
from server.api.routes_stats import router as stats_router
from server.config import get_settings
from server.database import init_db
from server.utils.exceptions import AppError
from server.utils.logger import configure_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    init_db()
    yield


settings = get_settings()
logger = logging.getLogger(__name__)
app = FastAPI(
    title="创作工具箱",
    version="2.1.0",
    lifespan=lifespan,
)

# 修复CORS配置：当使用credentials时不能用allow_origins=["*"]
# 如果配置为["*"]，则使用allow_origin_regex匹配所有来源（允许携带credentials）
cors_origins = settings.cors_origins
cors_kwargs = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if cors_origins == ["*"]:
    cors_kwargs["allow_origin_regex"] = ".*"
else:
    cors_kwargs["allow_origins"] = cors_origins

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.middleware("http")
async def visitor_cookie_middleware(request: Request, call_next):
    """为新访客生成唯一cookie标识，用于访问统计防刷"""
    response: Response = await call_next(request)
    if not request.cookies.get("toolbox_visitor_id"):
        visitor_id = str(uuid.uuid4())
        response.set_cookie(
            key="toolbox_visitor_id",
            value=visitor_id,
            max_age=365 * 24 * 60 * 60,
            httponly=True,
            samesite="lax",
        )
    return response


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else {}
    message = first_error.get("msg", "请求参数校验失败。")
    safe_errors = []
    for error in exc.errors():
        copied = dict(error)
        if "ctx" in copied:
            copied["ctx"] = {key: str(value) for key, value in copied["ctx"].items()}
        safe_errors.append(copied)
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "detail": {
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": {"errors": safe_errors},
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "服务内部异常，请查看后端日志排查。",
                "details": {},
            },
        },
    )


app.include_router(health_router)
app.include_router(parse_router)
app.include_router(multimodal_router)
app.include_router(stats_router)
