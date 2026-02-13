from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from app.core.database import get_db
from app.core.auth import require_admin
from app.schemas.asamblea_schema import AsambleaCreate, AsambleaResponse, AsambleaUpdateEstado
from app.services.asamblea_service import (
    create_new_asamblea, 
    get_asambleas,
    update_asamblea_estado_service,
    delete_asamblea_service
)
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/asambleas", tags=["asambleas"])

# Endpoint para obtener todas las asambleas
@router.get("", response_model=dict)
def list_asambleas(
    skip: int = Query(0, ge=0, description="Número de registros a saltar"),
    limit: int = Query(100, ge=1, le=100, description="Número máximo de registros a retornar"),
    search: Optional[str] = Query(None, description="Búsqueda por título o descripción"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (CREADA, ACTIVA, CERRADA)"),
    fecha_desde: Optional[str] = Query(None, description="Filtrar desde fecha (formato: YYYY-MM-DD)"),
    fecha_hasta: Optional[str] = Query(None, description="Filtrar hasta fecha (formato: YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    try:
        result = get_asambleas(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            estado=estado,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta
        )
        
        # Convertir las asambleas a AsambleaResponse
        asambleas_response = [AsambleaResponse.model_validate(asamblea) for asamblea in result["asambleas"]]
        
        return {
            "asambleas": asambleas_response,
            "total": result["total"]
        }
    except OperationalError as e:
        error_msg = str(e)
        if "fecha_final" in error_msg.lower() or "column" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="La columna 'fecha_final' no existe en la base de datos. Por favor, ejecuta la migración SQL: ALTER TABLE public.asambleas ADD COLUMN IF NOT EXISTS fecha_final timestamptz NULL;"
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except Exception as e:
        error_msg = str(e)
        if "fecha_final" in error_msg.lower() or "column" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="La columna 'fecha_final' no existe en la base de datos. Por favor, ejecuta la migración SQL: ALTER TABLE public.asambleas ADD COLUMN IF NOT EXISTS fecha_final timestamptz NULL;"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching asambleas: {str(e)}"
        )

# Endpoint para crear una asamblea
@router.post("/create", response_model=AsambleaResponse)
def create_asamblea(
    data_asamblea: AsambleaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        asamblea = create_new_asamblea(
            db=db,
            data_asamblea=data_asamblea,
            created_by=current_user.get("username", "unknown")
        )
        return AsambleaResponse.model_validate(asamblea)
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating asamblea: {str(e)}"
        )

# Endpoint para obtener una asamblea por ID
@router.get("/{asamblea_id}", response_model=AsambleaResponse)
def get_asamblea(
    asamblea_id: UUID,
    db: Session = Depends(get_db)
):
    try:
        from app.repositories.asamblea_repository import get_asamblea_by_id
        asamblea = get_asamblea_by_id(db, asamblea_id)
        if not asamblea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asamblea no encontrada"
            )
        return AsambleaResponse.model_validate(asamblea)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener la asamblea: {str(e)}"
        )

# Endpoint para actualizar el estado de una asamblea
@router.put("/{asamblea_id}/estado", response_model=AsambleaResponse)
def update_asamblea_estado(
    asamblea_id: UUID,
    estado_update: AsambleaUpdateEstado,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        asamblea = update_asamblea_estado_service(
            db=db,
            asamblea_id=asamblea_id,
            nuevo_estado=estado_update.estado
        )
        return AsambleaResponse.model_validate(asamblea)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar el estado de la asamblea: {str(e)}"
        )

# Endpoint para eliminar una asamblea
@router.delete("/{asamblea_id}")
def delete_asamblea(
    asamblea_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    try:
        resultado = delete_asamblea_service(db=db, asamblea_id=asamblea_id)
        if resultado:
            return {"message": "Asamblea eliminada exitosamente"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asamblea no encontrada"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la asamblea: {str(e)}"
        )
