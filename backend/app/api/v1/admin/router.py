from fastapi import APIRouter, Depends
from app.api.v1.admin.auth import router as auth_router, get_admin_user
from app.api.v1.admin.services import router as services_router
from app.api.v1.admin.flags import router as flags_router
from app.api.v1.admin.scanners import router as scanners_router
from app.api.v1.admin.keys import router as keys_router

router = APIRouter(prefix="/admin")
router.include_router(auth_router, tags=["admin-auth"])

protected = APIRouter(dependencies=[Depends(get_admin_user)])
protected.include_router(services_router, tags=["admin-services"])
protected.include_router(flags_router, tags=["admin-flags"])
protected.include_router(scanners_router, tags=["admin-scanners"])
protected.include_router(keys_router, tags=["admin-keys"])
router.include_router(protected)
