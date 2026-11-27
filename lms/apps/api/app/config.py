"""Cấu hình đọc từ biến môi trường (file lms/.env)."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = API_DIR.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    NODE_ENV: str = "development"
    DATABASE_URL: str
    PORT: int = 4100
    WEB_ORIGIN: str = "http://localhost:5194"
    SESSION_DAYS: int = 14
    STORAGE_DIR: str = "./storage"
    AI_PROVIDER: Literal["openai", "mock"] = "mock"
    OPENAI_API_KEY: str | None = None
    AI_MODEL: str = "gpt-5.4-mini"
    AI_MODEL_STRONG: str = "gpt-5.4"
    AI_EMBED_MODEL: str = "text-embedding-3-small"
    AI_TTS_MODEL: str = "gpt-4o-mini-tts"
    AI_IMAGE_MODEL: str = "gpt-image-2"
    # Bản demo: bỏ màn đăng nhập, đổi vai bằng một cú bấm. Mặc định bật khi không phải production
    DEMO_MODE: Literal["true", "false"] | None = None
    # Email thông báo: smtp (máy dev dùng Mailpit), console (in ra log), memory (test), off
    MAIL_TRANSPORT: Literal["smtp", "console", "memory", "off"] = "smtp"
    SMTP_HOST: str = "127.0.0.1"
    SMTP_PORT: int = 1025
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = False
    MAIL_FROM: str = "LMS Studio <no-reply@studio.local>"
    # LMS công ty nhận gói qua API. Để trống thì chỉ tải gói về
    LMS_API_URL: str = "http://127.0.0.1:5196/lms-api"
    LMS_API_TOKEN: str = ""
    LMS_NAME: str = "LMS công ty"
    # Trình học đóng trong gói SCORM (build từ apps/web)
    SCORM_PLAYER_DIR: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "Settings":
        if self.AI_PROVIDER == "openai" and not self.OPENAI_API_KEY:
            raise ValueError("AI_PROVIDER=openai cần OPENAI_API_KEY")
        return self

    @property
    def sqlalchemy_url(self) -> str:
        url = self.DATABASE_URL
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def storage_root(self) -> Path:
        p = Path(self.STORAGE_DIR)
        return p if p.is_absolute() else (API_DIR / p).resolve()

    @property
    def scorm_player_dir(self) -> Path:
        return Path(self.SCORM_PLAYER_DIR) if self.SCORM_PLAYER_DIR else (API_DIR.parent / "web" / "dist-scorm")


@lru_cache
def settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


def demo_mode(s: Settings | None = None) -> bool:
    s = s or settings()
    return s.DEMO_MODE == "true" if s.DEMO_MODE else s.NODE_ENV != "production"
