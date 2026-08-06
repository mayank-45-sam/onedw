from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from loguru import logger

from app.core.config import settings
from app.core.exceptions import AppException
from app.middleware.cors import setup_cors
from app.middleware.logging import LoggingMiddleware, setup_logging
from app.api.v1.router import api_router
from app.db.database import init_db, check_database_connection, close_db
from app.utils.paths import ensure_directory
from app.seeds.startup_seed import run_startup_seed
from app.services.broadcast_service import broadcast_scheduler_loop


# Setup logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    ensure_directory(settings.LOG_DIR)
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")

    # Initialise Beanie (MongoDB) connection
    await init_db()

    if await check_database_connection():
        logger.info("MongoDB connection established")
    else:
        logger.warning("MongoDB connection unavailable at startup")

    # Auto-create collections + seed data on every startup
    try:
        await run_startup_seed()
    except Exception as e:
        logger.error(f"Startup seed failed: {e}")

    # Background loop that dispatches scheduled broadcasts when their time arrives.
    scheduler_task = asyncio.create_task(broadcast_scheduler_loop())

    yield

    scheduler_task.cancel()
    logger.info("Broadcast scheduler stopped")
    logger.info(f"Shutting down {settings.APP_NAME}")
    close_db()
    logger.info("MongoDB connection closed")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="OneDW - Professional Home Services Platform API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)


# Setup middleware
setup_cors(app)
app.add_middleware(LoggingMiddleware)


# Include routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "errors": None
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "message": "Validation error",
            "code": "VALIDATION_ERROR",
            "errors": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "Internal server error" if not settings.DEBUG else str(exc),
            "code": "INTERNAL_SERVER_ERROR",
            "errors": None
        }
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else None
    }


# Serve uploaded files
uploads_dir = ensure_directory(Path(settings.UPLOAD_DIR))
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# Wrap the FastAPI app with the Socket.IO ASGI application so HTTP routes and
# real-time WebSocket connections (the /socket.io endpoint) share one server.
from socketio import ASGIApp as SocketIOASGIApp
from app.core.socketio import sio

app = SocketIOASGIApp(sio, other_asgi_app=app)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
