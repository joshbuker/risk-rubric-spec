from fastapi import APIRouter
from app.api.v1.scores import router as scores_router
from app.api.v1.services import router as services_router
from app.api.v1.scanners import router as scanners_router
from app.api.v1.methodology import router as methodology_router
from app.api.v1.admin.router import router as admin_router

router = APIRouter()
router.include_router(scores_router, tags=["scores"])
router.include_router(services_router, tags=["services"])
router.include_router(scanners_router, tags=["scanners"])
router.include_router(methodology_router, tags=["methodology"])
router.include_router(admin_router)
