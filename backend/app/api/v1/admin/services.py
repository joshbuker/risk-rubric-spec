from fastapi import APIRouter

router = APIRouter()


@router.get("/services")
def list_services():
    return []
