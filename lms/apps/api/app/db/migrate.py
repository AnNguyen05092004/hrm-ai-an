"""Chạy migration Alembic tới bản mới nhất."""
from alembic import command
from alembic.config import Config

from app.config import API_DIR


def run_migrations() -> None:
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "migrations"))
    command.upgrade(cfg, "head")
