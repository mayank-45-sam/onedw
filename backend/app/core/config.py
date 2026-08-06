import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    APP_NAME: str = Field(default="OneDW API")
    APP_ENV: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    API_V1_PREFIX: str = Field(default="/api/v1")
    LOG_DIR: str = Field(default="logs")

    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)

    # Database - MongoDB
    MONGODB_URL: str = Field(
        default="mongodb://localhost:27017"
    )
    MONGODB_DB_NAME: str = Field(default="onedw")

    # Security
    SECRET_KEY: str = Field(default="your-secret-key-change-this-in-production")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"]
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    CORS_ALLOW_METHODS: List[str] = Field(default_factory=lambda: ["*"])
    CORS_ALLOW_HEADERS: List[str] = Field(default_factory=lambda: ["*"])

    # File Upload
    MAX_UPLOAD_SIZE: int = Field(default=10485760)  # 10MB
    UPLOAD_DIR: str = Field(default="uploads")

    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # OTP
    OTP_EXPIRE_MINUTES: int = Field(default=10)

    # Email
    SMTP_HOST: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_FROM: str = Field(default="noreply@onedw.app")

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = Field(default="")

    # Socket.IO
    SOCKETIO_CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
    )

    # AI Chat
    AI_API_KEY: str = Field(default="")
    AI_MODEL: str = Field(default="openai/gpt-4o-mini")
    AI_API_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    AI_MAX_TOKENS: int = Field(default=1024)
    AI_RATE_LIMIT_PER_MINUTE: int = Field(default=10)

    # Gemini Vision
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash")

    # Gemini Image generation (skill-test question images)
    GEMINI_IMAGE_MODEL: str = Field(default="imagen-3.0-generate-002")
    GEMINI_IMAGE_MAX_ATTEMPTS: int = Field(default=2)

    # Groq Whisper (speech-to-text fallback for voice transcription)
    GROQ_API_KEY: str = Field(default="")
    GROQ_WHISPER_MODEL: str = Field(default="whisper-large-v3-turbo")

    @field_validator(
        "CORS_ORIGINS",
        "CORS_ALLOW_METHODS",
        "CORS_ALLOW_HEADERS",
        "SOCKETIO_CORS_ORIGINS",
        mode="before",
    )
    @classmethod
    def parse_list_settings(cls, v: Union[str, List[str]]) -> Union[str, List[str]]:
        if isinstance(v, str):
            import json

            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("APP_ENV")
    @classmethod
    def normalize_app_env(cls, v: str) -> str:
        return v.lower()

    def model_post_init(self, __context) -> None:
        if self.is_production and self.SECRET_KEY == "your-secret-key-change-this-in-production":
            raise ValueError(
                "SECRET_KEY must be set to a secure value in production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV in {"production", "prod"}

    @property
    def cors_origins_list(self) -> List[str]:
        return self.CORS_ORIGINS

    @property
    def cors_methods_list(self) -> List[str]:
        return self.CORS_ALLOW_METHODS

    @property
    def cors_headers_list(self) -> List[str]:
        return self.CORS_ALLOW_HEADERS

    @property
    def socketio_origins_list(self) -> List[str]:
        return self.SOCKETIO_CORS_ORIGINS


settings = Settings()
