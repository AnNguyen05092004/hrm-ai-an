"""Application API (FastAPI). Chạy: uvicorn --factory app.main:serve --port 4100 (npm run dev -w apps/api)"""
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.modules.courses import artifact_routes, kit_publish_routes, kit_routes, view
from app.modules.exams import bank_routes
from app.modules.identity import auth_routes, misc_routes, users_routes
from app.modules.lms_export import routes as lms_routes
from app.modules.media import images, video
from app.modules.notifications import routes as notification_routes
from app.modules.reviews import routes as review_routes
from app.modules.sources import routes as source_routes
from app.shared import http

API_BODY_LIMIT = 5 * 1024 * 1024


def create_app(migrate: bool = False) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if migrate:
            from app.db.migrate import run_migrations
            run_migrations()
        yield

    app = FastAPI(title="LMS Studio API", version="2.0.0", lifespan=lifespan, default_response_class=http.JSResponse, docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
    app.state.log = logging.getLogger("lms.api")
    http.install(app)

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True}

    app.include_router(auth_routes.router, prefix="/api/auth", tags=["identity"])
    app.include_router(misc_routes.router, prefix="/api", tags=["identity"])
    app.include_router(users_routes.router, prefix="/api", tags=["identity"])
    app.include_router(source_routes.router, prefix="/api/sources", tags=["sources"])
    app.include_router(kit_publish_routes.router, prefix="/api/kits", tags=["courses"])
    app.include_router(lms_routes.router, prefix="/api/kits", tags=["lms-export"])
    app.include_router(kit_routes.router, prefix="/api/kits", tags=["courses"])
    app.include_router(bank_routes.router, prefix="/api/exams", tags=["exams"])
    app.include_router(artifact_routes.router, prefix="/api/artifacts", tags=["courses"])
    app.include_router(view.router, prefix="/api/view", tags=["courses"])
    app.include_router(review_routes.router, prefix="/api/reviews", tags=["reviews"])
    app.include_router(notification_routes.router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(images.router, prefix="/api", tags=["media"])
    app.include_router(video.router, prefix="/api", tags=["media"])
    return app


def serve() -> FastAPI:
    """Điểm vào cho uvicorn --factory: ghi log và chạy migration khi khởi động"""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    return create_app(migrate=True)
