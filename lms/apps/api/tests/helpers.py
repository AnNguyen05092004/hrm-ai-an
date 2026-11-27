import io
import zipfile

from app.shared.jobs import drain_jobs

__all__ = ["drain_jobs", "unzip", "kit_by"]


def unzip(data: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        return {n: z.read(n) for n in z.namelist()}


def kit_by(client, prefix: str) -> dict:  # noqa: ANN001
    return next(k for k in client("GET", "/api/kits").body if k["title"].startswith(prefix))
