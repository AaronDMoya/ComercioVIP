from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.registro_repository import (
    get_registros_by_asamblea, 
    search_registros,
    get_registro_by_id,
    buscar_registros_para_poderes,
    buscar_registro_con_poder,
    buscar_dueno_original_poder,
    update_registro,
    verificar_control_existente,
    verificar_control_en_poderes,
    get_estadisticas_ingreso_por_hora,
    get_estadisticas_quorum_coeficiente
)
from app.repositories.asamblea_repository import get_asamblea_by_id
from uuid import UUID
from typing import Optional, Dict, Any

# Servicio para obtener un registro por ID
def get_registro_service(db: Session, registro_id: UUID):
    registro = get_registro_by_id(db, registro_id)
    if not registro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado"
        )
    return registro

# Servicio para obtener todos los registros de una asamblea
def get_registros(db: Session, asamblea_id: UUID):
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    registros = get_registros_by_asamblea(db=db, asamblea_id=asamblea_id)
    
    return registros

# Servicio para buscar registros
def search_registros_service(
    db: Session,
    asamblea_id: UUID,
    cedula: Optional[str] = None,
    numero_torre: Optional[str] = None,
    numero_apartamento: Optional[str] = None,
    numero_control: Optional[str] = None
):
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    registros = search_registros(
        db=db,
        asamblea_id=asamblea_id,
        cedula=cedula,
        numero_torre=numero_torre,
        numero_apartamento=numero_apartamento,
        numero_control=numero_control
    )
    
    return registros

# Servicio para buscar registros para autocompletado de poderes
def buscar_registros_para_poderes_service(
    db: Session,
    asamblea_id: UUID,
    torre: Optional[str] = None,
    apartamento: Optional[str] = None,
    numero_control: Optional[str] = None,
    limit: int = 10
):
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    registros = buscar_registros_para_poderes(
        db=db,
        asamblea_id=asamblea_id,
        torre=torre,
        apartamento=apartamento,
        numero_control=numero_control,
        limit=limit
    )
    
    return registros

# Servicio para buscar registro que tiene un poder específico
def buscar_registro_con_poder_service(
    db: Session,
    asamblea_id: UUID,
    torre: str,
    apartamento: str,
    numero_control: str
):
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    registro = buscar_registro_con_poder(
        db=db,
        asamblea_id=asamblea_id,
        torre=torre,
        apartamento=apartamento,
        numero_control=numero_control
    )
    
    return registro

# Servicio para actualizar registro
def update_registro_service(
    db: Session,
    registro_id: UUID,
    gestion_poderes: Optional[Dict[str, Any]] = None,
    actividad_ingreso: Optional[Dict[str, Any]] = None,
    numero_control: Optional[str] = None,
    set_numero_control_none: bool = False
):
    registro = get_registro_by_id(db, registro_id)
    if not registro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado"
        )
    
    registro_actualizado = update_registro(
        db=db,
        registro_id=registro_id,
        gestion_poderes=gestion_poderes,
        actividad_ingreso=actividad_ingreso,
        numero_control=numero_control,
        _numero_control_set_none=set_numero_control_none
    )
    
    return registro_actualizado

# Servicio para transferir un poder de un registro a otro
def transferir_poder_service(
    db: Session,
    asamblea_id: UUID,
    registro_destino_id: UUID,
    torre: str,
    apartamento: str,
    numero_control: str
):
    """
    Transfiere un poder de un registro a otro.
    1. Busca el registro que tiene el poder
    2. Remueve el poder de ese registro
    3. Agrega el poder al registro destino
    """
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    # Verificar que el registro destino existe
    registro_destino = get_registro_by_id(db, registro_destino_id)
    if not registro_destino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro destino no encontrado"
        )
    
    # Buscar el registro que tiene el poder
    registro_origen = buscar_registro_con_poder(
        db=db,
        asamblea_id=asamblea_id,
        torre=torre,
        apartamento=apartamento,
        numero_control=numero_control
    )
    
    if not registro_origen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró un registro con el poder especificado"
        )
    
    # Si el poder ya está en el registro destino, no hacer nada
    if registro_origen.id == registro_destino_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El poder ya pertenece a este registro"
        )
    
    # Remover el poder del registro origen
    poderes_origen = registro_origen.gestion_poderes or {}
    nuevo_poderes_origen = {}
    poder_removido_era_poder_1 = False
    poder_removido_key = None
    
    if isinstance(poderes_origen, dict):
        for poder_key, poder_data in poderes_origen.items():
            if isinstance(poder_data, dict):
                poder_torre = poder_data.get("torre") or poder_data.get("numero_torre") or ""
                poder_apartamento = poder_data.get("apartamento") or poder_data.get("numero_apartamento") or ""
                poder_control = poder_data.get("numero_control") or ""
                
                # Verificar si es el poder que estamos buscando
                if (poder_torre.strip().lower() == torre.strip().lower() and
                    poder_apartamento.strip().lower() == apartamento.strip().lower() and
                    poder_control.strip().lower() == numero_control.strip().lower()):
                    poder_removido_key = poder_key
                    poder_removido_era_poder_1 = (poder_key == "poder_1")
                else:
                    # Si no es el poder que estamos buscando, mantenerlo
                    nuevo_poderes_origen[poder_key] = poder_data
    
    # Si el poder removido era poder_1, dejarlo vacío
    if poder_removido_era_poder_1:
        nuevo_poderes_origen["poder_1"] = {
            "torre": "",
            "apartamento": "",
            "numero_control": ""
        }
        # Reorganizar los demás poderes para mantener la secuencia
        poderes_reorganizados = {"poder_1": nuevo_poderes_origen["poder_1"]}
        otros_poderes = {k: v for k, v in nuevo_poderes_origen.items() if k != "poder_1"}
        num = 2
        for key in sorted(otros_poderes.keys(), key=lambda x: int(x.replace("poder_", "")) if x.replace("poder_", "").isdigit() else 999):
            poderes_reorganizados[f"poder_{num}"] = otros_poderes[key]
            num += 1
        nuevo_poderes_origen = poderes_reorganizados
    elif nuevo_poderes_origen:
        # Reorganizar los poderes para mantener la secuencia (poder_1, poder_2, etc.)
        poderes_reorganizados = {}
        num = 1
        for key in sorted(nuevo_poderes_origen.keys(), key=lambda x: int(x.replace("poder_", "")) if x.replace("poder_", "").isdigit() else 999):
            poderes_reorganizados[f"poder_{num}"] = nuevo_poderes_origen[key]
            num += 1
        nuevo_poderes_origen = poderes_reorganizados
    
    # Agregar el poder al registro destino
    poderes_destino = registro_destino.gestion_poderes or {}
    if not isinstance(poderes_destino, dict):
        poderes_destino = {}
    
    # Encontrar el siguiente número de poder
    max_num = 0
    for key in poderes_destino.keys():
        if key.startswith("poder_"):
            try:
                num = int(key.replace("poder_", ""))
                max_num = max(max_num, num)
            except:
                pass
    
    nuevo_poder = {
        "torre": torre,
        "apartamento": apartamento,
        "numero_control": numero_control
    }
    
    poderes_destino[f"poder_{max_num + 1}"] = nuevo_poder
    
    # Reorganizar los poderes del destino para mantener la secuencia
    poderes_destino_reorganizados = {}
    num = 1
    for key in sorted(poderes_destino.keys(), key=lambda x: int(x.replace("poder_", "")) if x.replace("poder_", "").isdigit() else 999):
        poderes_destino_reorganizados[f"poder_{num}"] = poderes_destino[key]
        num += 1
    
    # Si no quedan poderes en el origen, crear poder_1 vacío
    if not nuevo_poderes_origen:
        nuevo_poderes_origen = {"poder_1": {"torre": "", "apartamento": "", "numero_control": ""}}
    
    # Actualizar ambos registros
    update_registro(
        db=db,
        registro_id=registro_origen.id,
        gestion_poderes=nuevo_poderes_origen
    )
    
    update_registro(
        db=db,
        registro_id=registro_destino_id,
        gestion_poderes=poderes_destino_reorganizados
    )
    
    return {
        "registro_origen": registro_origen,
        "registro_destino": registro_destino
    }

# Servicio para devolver un poder a su dueño original
def devolver_poder_service(
    db: Session,
    asamblea_id: UUID,
    registro_actual_id: UUID,
    torre: str,
    apartamento: str,
    numero_control: str
):
    """
    Devuelve un poder a su dueño original.
    1. Busca el dueño original del poder (quien tiene esos datos como su poder_1)
    2. Remueve el poder del registro actual
    3. Devuelve el poder al dueño original
    """
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    # Verificar que el registro actual existe
    registro_actual = get_registro_by_id(db, registro_actual_id)
    if not registro_actual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro actual no encontrado"
        )
    
    # Buscar el dueño original del poder
    dueno_original = buscar_dueno_original_poder(
        db=db,
        asamblea_id=asamblea_id,
        torre=torre,
        apartamento=apartamento,
        numero_control=numero_control
    )
    
    if not dueno_original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el dueño original del poder"
        )
    
    # Si el poder ya está en el dueño original, no hacer nada
    if dueno_original.id == registro_actual_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El poder ya pertenece a su dueño original"
        )
    
    # Remover el poder del registro actual
    poderes_actuales = registro_actual.gestion_poderes or {}
    nuevo_poderes_actuales = {}
    
    if isinstance(poderes_actuales, dict):
        for poder_key, poder_data in poderes_actuales.items():
            if isinstance(poder_data, dict):
                poder_torre = poder_data.get("torre") or poder_data.get("numero_torre") or ""
                poder_apartamento = poder_data.get("apartamento") or poder_data.get("numero_apartamento") or ""
                poder_control = poder_data.get("numero_control") or ""
                
                # Si no es el poder que estamos devolviendo, mantenerlo
                if not (poder_torre.strip().lower() == torre.strip().lower() and
                        poder_apartamento.strip().lower() == apartamento.strip().lower() and
                        poder_control.strip().lower() == numero_control.strip().lower()):
                    nuevo_poderes_actuales[poder_key] = poder_data
    
    # Reorganizar los poderes del registro actual
    if nuevo_poderes_actuales:
        poderes_reorganizados = {}
        num = 1
        for key in sorted(nuevo_poderes_actuales.keys(), key=lambda x: int(x.replace("poder_", "")) if x.replace("poder_", "").isdigit() else 999):
            poderes_reorganizados[f"poder_{num}"] = nuevo_poderes_actuales[key]
            num += 1
        nuevo_poderes_actuales = poderes_reorganizados
    else:
        # Si no quedan poderes, dejar poder_1 vacío
        nuevo_poderes_actuales = {"poder_1": {"torre": "", "apartamento": "", "numero_control": ""}}
    
    # Agregar el poder al dueño original
    poderes_dueno = dueno_original.gestion_poderes or {}
    if not isinstance(poderes_dueno, dict):
        poderes_dueno = {}
    
    # Verificar si el poder_1 del dueño original está vacío
    poder_1_vacio = False
    if "poder_1" in poderes_dueno:
        poder_1 = poderes_dueno["poder_1"]
        if isinstance(poder_1, dict):
            poder_1_torre = (poder_1.get("torre") or poder_1.get("numero_torre") or "").strip()
            poder_1_apto = (poder_1.get("apartamento") or poder_1.get("numero_apartamento") or "").strip()
            poder_1_control = (poder_1.get("numero_control") or "").strip()
            poder_1_vacio = not poder_1_torre and not poder_1_apto and not poder_1_control
    
    if poder_1_vacio:
        # Si poder_1 está vacío, restaurarlo ahí
        poderes_dueno["poder_1"] = {
            "torre": torre,
            "apartamento": apartamento,
            "numero_control": numero_control
        }
    else:
        # Si poder_1 no está vacío, agregar como siguiente poder
        max_num = 0
        for key in poderes_dueno.keys():
            if key.startswith("poder_"):
                try:
                    num = int(key.replace("poder_", ""))
                    max_num = max(max_num, num)
                except:
                    pass
        
        poderes_dueno[f"poder_{max_num + 1}"] = {
            "torre": torre,
            "apartamento": apartamento,
            "numero_control": numero_control
        }
    
    # Reorganizar los poderes del dueño original
    poderes_dueno_reorganizados = {}
    num = 1
    for key in sorted(poderes_dueno.keys(), key=lambda x: int(x.replace("poder_", "")) if x.replace("poder_", "").isdigit() else 999):
        poderes_dueno_reorganizados[f"poder_{num}"] = poderes_dueno[key]
        num += 1
    
    # Actualizar ambos registros
    registro_actual_actualizado = update_registro(
        db=db,
        registro_id=registro_actual_id,
        gestion_poderes=nuevo_poderes_actuales
    )
    
    dueno_original_actualizado = update_registro(
        db=db,
        registro_id=dueno_original.id,
        gestion_poderes=poderes_dueno_reorganizados
    )
    
    return {
        "registro_actual": registro_actual_actualizado,
        "dueno_original": dueno_original_actualizado
    }

# Servicio para verificar si un número de control ya está asignado
def verificar_control_existente_service(
    db: Session,
    asamblea_id: UUID,
    numero_control: str,
    registro_id_excluir: Optional[UUID] = None
):
    """
    Verifica si un número de control ya está asignado a otro registro.
    """
    registro = verificar_control_existente(
        db=db,
        asamblea_id=asamblea_id,
        numero_control=numero_control,
        registro_id_excluir=registro_id_excluir
    )
    
    return registro

# Servicio para verificar si un número de control existe en algún poder
def verificar_control_en_poderes_service(
    db: Session,
    asamblea_id: UUID,
    numero_control: str,
    registro_id_excluir: Optional[UUID] = None
):
    """
    Verifica si un número de control ya existe en algún poder de gestion_poderes.
    """
    registro = verificar_control_en_poderes(
        db=db,
        asamblea_id=asamblea_id,
        numero_control=numero_control,
        registro_id_excluir=registro_id_excluir
    )
    
    return registro

# Servicio para obtener estadísticas de ingreso por hora
def get_estadisticas_ingreso_por_hora_service(db: Session, asamblea_id: UUID):
    """
    Obtiene las estadísticas de ingreso agrupadas por hora.
    Solo cuenta actividades de tipo 'ingreso' o 'reingreso'.
    """
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    estadisticas = get_estadisticas_ingreso_por_hora(db=db, asamblea_id=asamblea_id)
    
    return estadisticas

# Servicio para obtener estadísticas de quorum y coeficiente presente
def get_estadisticas_quorum_coeficiente_service(db: Session, asamblea_id: UUID):
    """
    Obtiene las estadísticas de quorum y coeficiente presente.
    """
    # Verificar que la asamblea existe
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asamblea no encontrada"
        )
    
    estadisticas = get_estadisticas_quorum_coeficiente(db=db, asamblea_id=asamblea_id)
    
    return estadisticas
