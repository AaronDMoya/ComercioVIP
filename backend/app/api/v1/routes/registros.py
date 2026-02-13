from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from app.core.database import get_db
from app.schemas.registro_schema import RegistroResponse, RegistroUpdate
from app.services.registro_service import (
    get_registros, 
    search_registros_service,
    buscar_registros_para_poderes_service,
    buscar_registro_con_poder_service,
    update_registro_service,
    transferir_poder_service,
    devolver_poder_service,
    verificar_control_existente_service,
    verificar_control_en_poderes_service,
    get_estadisticas_ingreso_por_hora_service,
    get_estadisticas_quorum_coeficiente_service
)
from uuid import UUID
from typing import Optional

router = APIRouter(prefix="/registros", tags=["registros"])

# Endpoint para obtener todos los registros de una asamblea
@router.get("/asamblea/{asamblea_id}", response_model=list[RegistroResponse])
def list_registros(
    asamblea_id: UUID,
    db: Session = Depends(get_db)
):
    try:
        registros = get_registros(db=db, asamblea_id=asamblea_id)
        
        # Convertir los registros a RegistroResponse
        registros_response = [RegistroResponse.model_validate(registro) for registro in registros]
        
        return registros_response
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
            detail=f"An error occurred while fetching registros: {str(e)}"
        )

# Endpoint para buscar registros
@router.get("/asamblea/{asamblea_id}/buscar", response_model=list[RegistroResponse])
def buscar_registros(
    asamblea_id: UUID,
    cedula: Optional[str] = Query(None, description="Cédula de identidad"),
    numero_torre: Optional[str] = Query(None, description="Número de torre/bloque"),
    numero_apartamento: Optional[str] = Query(None, description="Número de apartamento/casa"),
    numero_control: Optional[str] = Query(None, description="Número de control"),
    db: Session = Depends(get_db)
):
    try:
        registros = search_registros_service(
            db=db,
            asamblea_id=asamblea_id,
            cedula=cedula,
            numero_torre=numero_torre,
            numero_apartamento=numero_apartamento,
            numero_control=numero_control
        )
        
        # Convertir los registros a RegistroResponse
        registros_response = [RegistroResponse.model_validate(registro) for registro in registros]
        
        return registros_response
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
            detail=f"An error occurred while searching registros: {str(e)}"
        )

# Endpoint para buscar registros para autocompletado de poderes
@router.get("/asamblea/{asamblea_id}/poderes/buscar", response_model=list[RegistroResponse])
def buscar_registros_para_poderes(
    asamblea_id: UUID,
    torre: Optional[str] = Query(None, description="Torre/Bloque"),
    apartamento: Optional[str] = Query(None, description="Apto/Casa"),
    numero_control: Optional[str] = Query(None, description="Número de control"),
    limit: int = Query(10, description="Límite de resultados"),
    db: Session = Depends(get_db)
):
    try:
        registros = buscar_registros_para_poderes_service(
            db=db,
            asamblea_id=asamblea_id,
            torre=torre,
            apartamento=apartamento,
            numero_control=numero_control,
            limit=limit
        )
        
        registros_response = [RegistroResponse.model_validate(registro) for registro in registros]
        return registros_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al buscar registros para poderes: {str(e)}"
        )

# Endpoint para verificar si un poder existe
@router.get("/asamblea/{asamblea_id}/poderes/verificar", response_model=RegistroResponse)
def verificar_poder(
    asamblea_id: UUID,
    torre: str = Query(..., description="Torre/Bloque"),
    apartamento: str = Query(..., description="Apto/Casa"),
    numero_control: str = Query(..., description="Número de control"),
    db: Session = Depends(get_db)
):
    try:
        registro = buscar_registro_con_poder_service(
            db=db,
            asamblea_id=asamblea_id,
            torre=torre,
            apartamento=apartamento,
            numero_control=numero_control
        )
        
        if not registro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un registro con el poder especificado"
            )
        
        return RegistroResponse.model_validate(registro)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar poder: {str(e)}"
        )

# Endpoint para actualizar un registro
@router.put("/{registro_id}", response_model=RegistroResponse)
def actualizar_registro(
    registro_id: UUID,
    registro_update: RegistroUpdate,
    db: Session = Depends(get_db)
):
    try:
        # Verificar si numero_control fue enviado explícitamente usando model_dump
        # exclude_unset=True solo incluye campos que fueron enviados en el request
        campos_enviados = registro_update.model_dump(exclude_unset=True)
        numero_control_was_provided = 'numero_control' in campos_enviados
        numero_control_value = registro_update.numero_control
        
        # Si numero_control fue proporcionado explícitamente como None, establecerlo a None en la BD
        set_none = numero_control_was_provided and numero_control_value is None
        
        registro = update_registro_service(
            db=db,
            registro_id=registro_id,
            gestion_poderes=registro_update.gestion_poderes,
            actividad_ingreso=registro_update.actividad_ingreso,
            numero_control=numero_control_value,
            set_numero_control_none=set_none
        )
        
        return RegistroResponse.model_validate(registro)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar registro: {str(e)}"
        )

# Endpoint para transferir un poder
@router.post("/asamblea/{asamblea_id}/poderes/transferir")
def transferir_poder(
    asamblea_id: UUID,
    registro_destino_id: UUID = Body(..., description="ID del registro destino"),
    torre: str = Body(..., description="Torre/Bloque"),
    apartamento: str = Body(..., description="Apto/Casa"),
    numero_control: str = Body(..., description="Número de control"),
    db: Session = Depends(get_db)
):
    try:
        resultado = transferir_poder_service(
            db=db,
            asamblea_id=asamblea_id,
            registro_destino_id=registro_destino_id,
            torre=torre,
            apartamento=apartamento,
            numero_control=numero_control
        )
        
        return {
            "registro_origen": RegistroResponse.model_validate(resultado["registro_origen"]),
            "registro_destino": RegistroResponse.model_validate(resultado["registro_destino"]),
            "message": "Poder transferido exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al transferir poder: {str(e)}"
        )

# Endpoint para verificar si un número de control ya está asignado en gestion_poderes
@router.get("/asamblea/{asamblea_id}/control/verificar", response_model=dict)
def verificar_control(
    asamblea_id: UUID,
    numero_control: str = Query(...),
    registro_id_excluir: Optional[UUID] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Verificar en gestion_poderes (poderes)
        registro = verificar_control_en_poderes_service(
            db=db,
            asamblea_id=asamblea_id,
            numero_control=numero_control,
            registro_id_excluir=registro_id_excluir
        )
        
        return {
            "existe": registro is not None,
            "registro": RegistroResponse.model_validate(registro) if registro else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar control: {str(e)}"
        )

# Endpoint para obtener el coeficiente del dueño original de un poder
@router.get("/asamblea/{asamblea_id}/poderes/coeficiente", response_model=dict)
def obtener_coeficiente_poder(
    asamblea_id: UUID,
    torre: str = Query(...),
    apartamento: str = Query(...),
    numero_control: str = Query(default=""),  # Opcional, no se usa en la búsqueda
    db: Session = Depends(get_db)
):
    try:
        from app.repositories.registro_repository import buscar_dueno_original_poder
        
        # Limpiar los valores antes de buscar
        torre_limpia = torre.strip() if torre else ""
        apartamento_limpio = apartamento.strip() if apartamento else ""
        
        if not torre_limpia and not apartamento_limpio:
            return {
                "coeficiente": None,
                "encontrado": False
            }
        
        dueno_original = buscar_dueno_original_poder(
            db=db,
            asamblea_id=asamblea_id,
            torre=torre_limpia,
            apartamento=apartamento_limpio,
            numero_control=""  # No se usa en la búsqueda
        )
        
        if not dueno_original:
            return {
                "coeficiente": None,
                "encontrado": False
            }
        
        coeficiente = dueno_original.coeficiente if dueno_original.coeficiente is not None else 0.0
        
        return {
            "coeficiente": float(coeficiente),
            "encontrado": True
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener coeficiente: {str(e)}"
        )

# Endpoint para devolver un poder a su dueño original
@router.post("/asamblea/{asamblea_id}/poderes/devolver", response_model=dict)
def devolver_poder(
    asamblea_id: UUID,
    registro_actual_id: UUID = Body(...),
    torre: str = Body(...),
    apartamento: str = Body(...),
    numero_control: str = Body(...),
    db: Session = Depends(get_db)
):
    try:
        resultado = devolver_poder_service(
            db=db,
            asamblea_id=asamblea_id,
            registro_actual_id=registro_actual_id,
            torre=torre,
            apartamento=apartamento,
            numero_control=numero_control
        )
        
        return {
            "registro_actual": RegistroResponse.model_validate(resultado["registro_actual"]),
            "dueno_original": RegistroResponse.model_validate(resultado["dueno_original"]),
            "message": "Poder devuelto exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al devolver poder: {str(e)}"
        )

# Endpoint para obtener estadísticas de ingreso por hora
@router.get("/asamblea/{asamblea_id}/estadisticas/ingreso-por-hora", response_model=dict)
def get_estadisticas_ingreso_por_hora(
    asamblea_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Obtiene las estadísticas de ingreso agrupadas por hora.
    Solo cuenta actividades de tipo 'ingreso' o 'reingreso'.
    """
    try:
        estadisticas = get_estadisticas_ingreso_por_hora_service(db=db, asamblea_id=asamblea_id)
        return estadisticas
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al obtener estadísticas de ingreso: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas de ingreso: {str(e)}"
        )

# Endpoint para obtener estadísticas de quorum y coeficiente presente
@router.get("/asamblea/{asamblea_id}/estadisticas/quorum-coeficiente", response_model=dict)
def get_estadisticas_quorum_coeficiente(
    asamblea_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Obtiene las estadísticas de quorum y coeficiente presente.
    """
    try:
        estadisticas = get_estadisticas_quorum_coeficiente_service(db=db, asamblea_id=asamblea_id)
        return estadisticas
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al obtener estadísticas de quorum y coeficiente: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas de quorum y coeficiente: {str(e)}"
        )

# Endpoint para obtener un registro por ID (debe estar al final para evitar conflictos con rutas más específicas)
@router.get("/{registro_id}", response_model=RegistroResponse)
def get_registro(
    registro_id: UUID,
    db: Session = Depends(get_db)
):
    try:
        from app.services.registro_service import get_registro_service
        registro = get_registro_service(db=db, registro_id=registro_id)
        return RegistroResponse.model_validate(registro)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener registro: {str(e)}"
        )
