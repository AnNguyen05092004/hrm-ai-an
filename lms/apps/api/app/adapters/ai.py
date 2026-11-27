"""AI Gateway: một chỗ gọi dịch vụ AI (OpenAI) cho cả API và Worker, áp chung hạn mức tháng và ghi lượng token.
AI_PROVIDER=mock trả kết quả giả lập (test, chạy không có key)."""
import base64
from collections.abc import Callable
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from pydantic import BaseModel
from sqlalchemy import func, select

from app.adapters.mock_embed import mock_embed
from app.config import settings
from app.shared import tables as t
from app.shared.db import independent, scalar
from app.shared.errors import AppError
from app.shared.tables import EMBED_DIM

EMBED_BATCH = 96
IMAGE_TOKEN_EQUIV = 4000  # giá ảnh tính theo ảnh; quy đổi tương đương token để vào chung hạn mức


def is_mock() -> bool:
    return settings().AI_PROVIDER == "mock"


@lru_cache
def _client() -> Any:
    from openai import OpenAI
    return OpenAI(api_key=settings().OPENAI_API_KEY, timeout=120, max_retries=2)


def _track(org_id: str, feature: str, model: str, inp: int = 0, out: int = 0) -> None:
    # giao dịch riêng: lượng token đã dùng vẫn được ghi khi thao tác chính lỗi
    with independent() as c:
        c.execute(t.ai_usage.insert().values(orgId=org_id, feature=feature, model=model, inputTokens=inp or 0, outputTokens=out or 0))


def month_start() -> datetime:
    return datetime.now(UTC).astimezone().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def month_usage(org_id: str) -> int:
    u = t.ai_usage.c
    return int(scalar(select(func.coalesce(func.sum(u.inputTokens + u.outputTokens), 0)).where(u.orgId == org_id, u.createdAt >= month_start())) or 0)


def _check_quota(org_id: str) -> None:
    quota = scalar(select(t.orgs.c.aiMonthlyTokens).where(t.orgs.c.id == org_id))
    if quota is not None and month_usage(org_id) >= quota:
        raise AppError(429, "ai_quota", "Tổ chức đã dùng hết hạn mức AI tháng này")


def ai_json(*, org_id: str, feature: str, system: str, input: str, schema: type[BaseModel], mock: Callable[[], dict], strong: bool = False) -> dict:
    """Gọi AI trả JSON đúng schema (structured output). Trả dict đã kiểm tra theo schema."""
    if is_mock():
        _track(org_id, feature, "mock")
        return schema.model_validate(mock()).model_dump()
    _check_quota(org_id)
    model = settings().AI_MODEL_STRONG if strong else settings().AI_MODEL
    r = _client().responses.parse(model=model, reasoning={"effort": "low"}, instructions=system, input=input, text_format=schema)
    usage = getattr(r, "usage", None)
    _track(org_id, feature, model, getattr(usage, "input_tokens", 0), getattr(usage, "output_tokens", 0))
    if r.output_parsed is None:
        raise AppError(502, "ai_failed", "AI không trả về kết quả hợp lệ, vui lòng thử lại")
    return r.output_parsed.model_dump()


def embed(org_id: str, texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if is_mock():
        return [mock_embed(x) for x in texts]
    _check_quota(org_id)
    out: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        part = [x[:8000] for x in texts[i:i + EMBED_BATCH]]
        r = _client().embeddings.create(model=settings().AI_EMBED_MODEL, input=part, dimensions=EMBED_DIM)
        out.extend(d.embedding for d in r.data)
        _track(org_id, "embed", settings().AI_EMBED_MODEL, r.usage.prompt_tokens, 0)
    return out


def image_gen(org_id: str, prompt: str) -> bytes | None:
    """Ảnh minh họa cho tài liệu đào tạo (PNG ngang 3:2). Mock trả None để bên gọi tự vẽ ảnh thay thế."""
    if is_mock():
        return None
    _check_quota(org_id)
    r = _client().images.generate(
        model=settings().AI_IMAGE_MODEL, size="1536x1024", quality="medium", n=1,
        prompt=f"Ảnh minh họa cho tài liệu đào tạo nội bộ doanh nghiệp. Phong cách ảnh chụp chân thực, ánh sáng tự nhiên, bố cục gọn. Không có chữ, không logo, không thương hiệu thật, không người nổi tiếng. Nội dung: {prompt}",
    )
    b64 = r.data[0].b64_json if r.data else None
    if not b64:
        raise RuntimeError("AI không trả về ảnh")
    usage = getattr(r, "usage", None)
    _track(org_id, "image", settings().AI_IMAGE_MODEL, getattr(usage, "input_tokens", 0) or 0, getattr(usage, "output_tokens", 0) or IMAGE_TOKEN_EQUIV)
    return base64.b64decode(b64)


def tts(org_id: str, text_: str) -> bytes | None:
    """Giọng đọc AI (giọng có sẵn của dịch vụ, không nhân bản giọng người thật)"""
    if is_mock():
        return None
    _check_quota(org_id)
    r = _client().audio.speech.create(model=settings().AI_TTS_MODEL, voice="alloy", input=text_[:4000], response_format="mp3")
    _track(org_id, "tts", settings().AI_TTS_MODEL, -(-len(text_) // 4), 0)
    return r.read() if hasattr(r, "read") else r.content
