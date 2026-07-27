import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger
from app.core.config import settings
from app.utils.paths import ensure_directory


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging HTTP requests and responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Log request
        start_time = time.time()
        
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "client_host": request.client.host if request.client else None,
            }
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
            }
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


def setup_logging():
    """
    Setup application logging configuration.
    """
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    # Remove default handler
    logger.remove()

    log_format = (
        "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
    )

    # Add console handler
    if settings.LOG_FORMAT == "json":
        logger.add(
            sys.stdout,
            format=log_format,
            level=settings.LOG_LEVEL,
            serialize=True,
        )
    else:
        logger.add(
            sys.stdout,
            format=(
                "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
                "<level>{message}</level>"
            ),
            level=settings.LOG_LEVEL,
        )

    ensure_directory(settings.LOG_DIR)

    # Add file handler for errors
    logger.add(
        f"{settings.LOG_DIR}/error.log",
        rotation="10 MB",
        retention="30 days",
        level="ERROR",
        format=log_format,
        encoding="utf-8",
    )
