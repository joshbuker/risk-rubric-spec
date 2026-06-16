from fastapi import APIRouter
from app.api.v1.scores import router as scores_router

router = APIRouter()
router.include_router(scores_router, tags=["scores"])
