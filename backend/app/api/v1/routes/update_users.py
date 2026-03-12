"""
Rutas públicas para que los usuarios actualicen sus datos.
Sin autenticación: ingreso por torre/apt o por token (link/QR en correo).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.registro_repository import (
    get_registro_by_token,
    get_registro_by_asamblea_torre_apt,
    ensure_token_actualizacion,
    update_registro_by_token,
)
from app.repositories.asamblea_repository import get_asamblea_by_id
from app.schemas.update_users_schema import (
    IngresoRequest,
    IngresoResponse,
    RegistroPublicResponse,
    RegistroActualizarRequest,
)
from uuid import UUID

router = APIRouter(prefix="/update-users", tags=["update-users"])


def _asamblea_no_disponible():
    return HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Esta asamblea ya ha finalizado y no permite actualizar datos.",
    )


@router.post("/ingreso", response_model=IngresoResponse)
def ingreso(data: IngresoRequest, db: Session = Depends(get_db)):
    """
    Ingreso por número de torre y apartamento. Valida contra la asamblea y devuelve
    un token para acceder a la página de actualizar datos.
    """
    asamblea = get_asamblea_by_id(db, data.asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada",
        )
    if asamblea.estado == "CERRADA":
        raise _asamblea_no_disponible()
    registro = get_registro_by_asamblea_torre_apt(
        db,
        data.asamblea_id,
        data.numero_torre,
        data.numero_apartamento,
    )
    if not registro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró un registro con esa torre y apartamento en esta asamblea.",
        )
    token = ensure_token_actualizacion(db, registro.id)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al generar token de acceso.",
        )
    return IngresoResponse(token=token)


@router.get("/registro", response_model=RegistroPublicResponse)
def get_registro_public(
    token: str = Query(..., description="Token de actualización"),
    db: Session = Depends(get_db),
):
    """Obtiene los datos editables del registro asociado al token."""
    registro = get_registro_by_token(db, token)
    if not registro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token no válido o expirado.",
        )
    asamblea = get_asamblea_by_id(db, registro.asamblea_id)
    if asamblea and asamblea.estado == "CERRADA":
        raise _asamblea_no_disponible()
    asamblea_title = asamblea.title if asamblea else "Asamblea"
    return RegistroPublicResponse(
        id=registro.id,
        asamblea_id=registro.asamblea_id,
        asamblea_title=asamblea_title,
        cedula=registro.cedula or "",
        nombre=registro.nombre or "",
        telefono=registro.telefono,
        correo=registro.correo,
        numero_torre=registro.numero_torre,
        numero_apartamento=registro.numero_apartamento,
    )


@router.patch("/registro", response_model=RegistroPublicResponse)
def actualizar_registro_public(data: RegistroActualizarRequest, db: Session = Depends(get_db)):
    """Actualiza solo cedula, nombre, telefono y correo del registro identificado por token."""
    registro_existente = get_registro_by_token(db, data.token)
    if not registro_existente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token no válido o expirado.",
        )
    asamblea = get_asamblea_by_id(db, registro_existente.asamblea_id)
    if asamblea and asamblea.estado == "CERRADA":
        raise _asamblea_no_disponible()
    registro = update_registro_by_token(
        db,
        token=data.token,
        cedula=data.cedula,
        nombre=data.nombre,
        telefono=data.telefono,
        correo=data.correo,
    )
    asamblea_title = asamblea.title if asamblea else "Asamblea"
    return RegistroPublicResponse(
        id=registro.id,
        asamblea_id=registro.asamblea_id,
        asamblea_title=asamblea_title,
        cedula=registro.cedula or "",
        nombre=registro.nombre or "",
        telefono=registro.telefono,
        correo=registro.correo,
        numero_torre=registro.numero_torre,
        numero_apartamento=registro.numero_apartamento,
    )
