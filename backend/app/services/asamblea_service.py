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
from app.repositories.registro_repository import get_registros_by_ids_and_asamblea
from app.services.email_service import send_reporte_control, send_aviso_actualizacion
from app.models.email_model import Email
from app.repositories.registro_repository import ensure_token_actualizacion
from app.core.config import FRONTEND_URL
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

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
            "correo": registro.correo,
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


def _numero_control_from_registro(registro: Any) -> str:
    """Obtiene el número de control del registro (campo o primer poder en gestion_poderes)."""
    if registro.numero_control:
        return str(registro.numero_control).strip()
    gp = registro.gestion_poderes
    if not gp or not isinstance(gp, dict):
        return ""
    for key in sorted(gp.keys()):
        poder = gp.get(key)
        if poder and isinstance(poder, dict) and poder.get("numero_control"):
            return str(poder["numero_control"]).strip()
    return ""


def send_reportes_control_service(
    db: Session,
    asamblea_id: UUID,
    registro_ids: List[UUID],
) -> Dict[str, Any]:
    """
    Envía el correo de reporte de control a los registros seleccionados.
    Solo se envían a registros con correo. Retorna enviados, fallidos y lista de errores.
    """
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada",
        )
    if asamblea.estado != "CERRADA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden enviar reportes de control cuando la asamblea está cerrada.",
        )
    registros = get_registros_by_ids_and_asamblea(db, asamblea_id, registro_ids)
    asamblea_title = asamblea.title or "Asamblea"
    enviados = 0
    fallidos = 0
    errores: List[str] = []
    for reg in registros:
        correo = (reg.correo or "").strip()
        if not correo:
            continue
        nombre = (reg.nombre or "Estimado/a").strip()
        numero_control = _numero_control_from_registro(reg) or "—"
        # Registrar en tabla emails antes de enviar (estado PENDIENTE)
        email_record = Email(
            asamblea_id=asamblea_id,
            destinatario=correo,
            estado="PENDIENTE",
            tipo="REPORTE CONTROL",
        )
        db.add(email_record)
        db.flush()
        try:
            ok = send_reporte_control(
                to_email=correo,
                nombre=nombre,
                numero_control=numero_control,
                asamblea_title=asamblea_title,
            )
            if ok:
                email_record.estado = "ENVIADO"
                enviados += 1
            else:
                email_record.estado = "ERROR"
                fallidos += 1
                errores.append(f"{correo}: no se pudo enviar")
        except Exception as e:
            email_record.estado = "ERROR"
            fallidos += 1
            errores.append(f"{correo}: {str(e)}")
        email_record.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"enviados": enviados, "fallidos": fallidos, "errores": errores}


def send_aviso_actualizacion_service(
    db: Session,
    asamblea_id: UUID,
    registro_ids: List[UUID],
) -> Dict[str, Any]:
    """
    Envía por correo el aviso para que los usuarios actualicen sus datos.
    Incluye en el correo un enlace único (con token) y QR para ir a la página de actualización.
    Solo se envían a registros con correo. Registra en tabla emails con tipo ACTUALIZACION.
    """
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada",
        )
    registros = get_registros_by_ids_and_asamblea(db, asamblea_id, registro_ids)
    asamblea_title = asamblea.title or "Asamblea"
    enviados = 0
    fallidos = 0
    errores: List[str] = []
    for reg in registros:
        correo = (reg.correo or "").strip()
        if not correo:
            continue
        nombre = (reg.nombre or "Estimado/a").strip()
        token = ensure_token_actualizacion(db, reg.id)
        if not token:
            fallidos += 1
            errores.append(f"{correo}: no se pudo generar enlace")
            continue
        url_actualizar = f"{FRONTEND_URL}/update-users/actualizar?token={token}"
        email_record = Email(
            asamblea_id=asamblea_id,
            destinatario=correo,
            estado="PENDIENTE",
            tipo="ACTUALIZACION",
        )
        db.add(email_record)
        db.flush()
        try:
            ok = send_aviso_actualizacion(
                to_email=correo,
                nombre=nombre,
                asamblea_title=asamblea_title,
                url_actualizar=url_actualizar,
            )
            if ok:
                email_record.estado = "ENVIADO"
                enviados += 1
            else:
                email_record.estado = "ERROR"
                fallidos += 1
                errores.append(f"{correo}: no se pudo enviar")
        except Exception as e:
            email_record.estado = "ERROR"
            fallidos += 1
            errores.append(f"{correo}: {str(e)}")
        email_record.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"enviados": enviados, "fallidos": fallidos, "errores": errores}
