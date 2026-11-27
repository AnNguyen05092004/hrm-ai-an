"""Test API: DB lms_studio_test riêng, AI giả lập, email giữ trong bộ nhớ. Mỗi file test seed lại dữ liệu mẫu."""
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

from dotenv_shim import load_env

load_env(Path(__file__).resolve().parents[3] / ".env")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgres://lms:lms@localhost:54329/lms_studio_test")
os.environ.update({"AI_PROVIDER": "mock", "NODE_ENV": "test", "MAIL_TRANSPORT": "memory", "LMS_API_URL": "http://lms.test/lms-api", "LMS_API_TOKEN": "test-token",
                   "STORAGE_DIR": tempfile.mkdtemp(prefix="lms-test-storage-")})
os.environ.pop("DEMO_MODE", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.job_registry  # noqa: E402,F401
from app.db.migrate import run_migrations  # noqa: E402
from app.db.seed import DEMO_PASSWORD, SeedIds, seed  # noqa: E402
from app.main import create_app  # noqa: E402
from app.modules.identity.demo_accounts import ADMIN_EMAIL, AUTHOR_EMAIL, REVIEWER_EMAIL  # noqa: E402
from app.shared.db import unit_of_work  # noqa: E402


class Client:
    """Gọi API như trình duyệt của một người (cookie phiên riêng, có header chống CSRF)"""

    def __init__(self, app, email: str | None = None) -> None:  # noqa: ANN001
        self.http = TestClient(app, base_url="http://localhost")
        if email:
            r = self.http.post("/api/auth/login", json={"email": email, "password": DEMO_PASSWORD}, headers={"x-lms": "1"})
            assert r.status_code == 200, r.text

    def __call__(self, method: str, url: str, body: object = None) -> "Res":
        r = self.http.request(method, url, headers={"x-lms": "1"}, **({"json": body} if body is not None else {}))
        return Res(r.status_code, r.json() if "json" in r.headers.get("content-type", "") else r.content, r)

    def upload(self, url: str, filename: str, content: bytes | str, mime: str = "text/plain") -> "Res":
        data = content.encode() if isinstance(content, str) else content
        r = self.http.post(url, files={"file": (filename, data, mime)}, headers={"x-lms": "1"})
        return Res(r.status_code, r.json(), r)


@dataclass
class Res:
    status: int
    body: object
    raw: object


@dataclass
class Ctx:
    app: object
    ids: SeedIds
    admin: Client
    author: Client
    reviewer: Client

    def login(self, email: str) -> Client:
        return Client(self.app, email)

    def anon(self) -> Client:
        return Client(self.app)


@pytest.fixture(scope="session", autouse=True)
def _migrated() -> None:
    run_migrations()


@pytest.fixture(scope="module")
def ctx() -> Ctx:
    with unit_of_work():
        ids = seed()
    app = create_app()
    return Ctx(app, ids, Client(app, ADMIN_EMAIL), Client(app, AUTHOR_EMAIL), Client(app, REVIEWER_EMAIL))
