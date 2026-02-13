from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from app.schemas.asamblea_schema import AsambleaCreate, AsambleaResponse
from app.repositories.asamblea_repository import (
    create_asamblea_with_registros,
    get_all_asambleas,
    count_asambleas,
    get_asamblea_by_id,
    update_asamblea_estado,
    delete_asamblea
)
from typing import List, Dict, Optional

# Servicio para crear una asamblea con sus registros
def create_new_asamblea(db: Session, data_asamblea: AsambleaCreate, created_by: str):
    # Preparar datos de la asamblea
    asamblea_data = {
        "title": data_asamblea.title,
        "description": data_asamblea.description,
        "estado": data_asamblea.estado
    }
    
    # Preparar datos de los registros
    registros_data = []
    for registro in data_asamblea.registros:
        registro_dict = {
            "cedula": registro.cedula,
            "nombre": registro.nombre,
            "telefono": registro.telefono,
            "numero_torre": registro.numero_torre,
            "numero_apartamento": registro.numero_apartamento,
            "numero_control": registro.numero_control,
            "coeficiente": registro.coeficiente
        }
        registros_data.append(registro_dict)
    
    try:
        asamblea = create_asamblea_with_registros(
            db=db,
            asamblea_data=asamblea_data,
            registros_data=registros_data,
            created_by=created_by
        )
        return asamblea
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la asamblea: {str(e)}"
        )

# Servicio para obtener todas las asambleas con filtros
def get_asambleas(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    estado: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None
):
    asambleas = get_all_asambleas(db, skip=skip, limit=limit, search=search, estado=estado, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    total = count_asambleas(db, search=search, estado=estado, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    
    return {
        "asambleas": asambleas,
        "total": total
    }

# Servicio para actualizar el estado de una asamblea
def update_asamblea_estado_service(db: Session, asamblea_id: UUID, nuevo_estado: str):
    """
    Actualiza el estado de una asamblea con validación de transiciones.
    """
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    try:
        asamblea_actualizada = update_asamblea_estado(
            db=db,
            asamblea_id=asamblea_id,
            nuevo_estado=nuevo_estado
        )
        return asamblea_actualizada
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar el estado de la asamblea: {str(e)}"
        )

# Servicio para eliminar una asamblea
def delete_asamblea_service(db: Session, asamblea_id: UUID):
    """
    Elimina una asamblea y todos sus registros asociados.
    """
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    try:
        resultado = delete_asamblea(db=db, asamblea_id=asamblea_id)
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la asamblea: {str(e)}"
        )
