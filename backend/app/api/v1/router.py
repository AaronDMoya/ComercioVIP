from fastapi import APIRouter
from app.api.v1.routes import health
from app.api.v1.routes import users
from app.api.v1.routes import auth
from app.api.v1.routes import asambleas
from app.api.v1.routes import registros

router = APIRouter()

router.include_router(health.router)
router.include_router(users.router)
router.include_router(auth.router)
router.include_router(asambleas.router)
router.include_router(registros.router)