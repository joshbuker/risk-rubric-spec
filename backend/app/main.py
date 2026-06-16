from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.v1.router import router as v1_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Risk Rubric API", version="1.0.0", lifespan=lifespan)
app.include_router(v1_router, prefix="/api/v1")
