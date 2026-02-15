from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.asamblea_model import AsambleaRegistro
from uuid import UUID
from typing import Optional, List
from datetime import datetime
import re

# Obtener todos los registros de una asamblea
def get_registros_by_asamblea(db: Session, asamblea_id: UUID):
    query = db.query(AsambleaRegistro).filter(AsambleaRegistro.asamblea_id == asamblea_id)
    
    # Ordenar por nombre
    query = query.order_by(AsambleaRegistro.nombre)
    
    return query.all()

# Buscar registros por criterios
def search_registros(
    db: Session,
    asamblea_id: UUID,
    cedula: Optional[str] = None,
    numero_torre: Optional[str] = None,
    numero_apartamento: Optional[str] = None,
    numero_control: Optional[str] = None
):
    query = db.query(AsambleaRegistro).filter(AsambleaRegistro.asamblea_id == asamblea_id)
    
    # Aplicar filtros si se proporcionan
    if cedula:
        query = query.filter(AsambleaRegistro.cedula.ilike(f"%{cedula}%"))
    if numero_torre:
        query = query.filter(AsambleaRegistro.numero_torre.ilike(f"%{numero_torre}%"))
    if numero_apartamento:
        query = query.filter(AsambleaRegistro.numero_apartamento.ilike(f"%{numero_apartamento}%"))
    if numero_control:
        query = query.filter(AsambleaRegistro.numero_control.ilike(f"%{numero_control}%"))
    
    # Ordenar por nombre
    query = query.order_by(AsambleaRegistro.nombre)
    
    return query.all()

# Obtener un registro por ID
def get_registro_by_id(db: Session, registro_id: UUID):
    return db.query(AsambleaRegistro).filter(AsambleaRegistro.id == registro_id).first()

# Buscar registros para autocompletado de poderes
def buscar_registros_para_poderes(
    db: Session,
    asamblea_id: UUID,
    torre: Optional[str] = None,
    apartamento: Optional[str] = None,
    numero_control: Optional[str] = None,
    limit: int = 10
):
    """
    Busca registros que coincidan con los criterios para autocompletado.
    Retorna solo los campos necesarios para mostrar sugerencias.
    """
    query = db.query(AsambleaRegistro).filter(AsambleaRegistro.asamblea_id == asamblea_id)
    
    # Construir filtros dinámicos
    condiciones = []
    if torre:
        condiciones.append(AsambleaRegistro.numero_torre.ilike(f"%{torre}%"))
    if apartamento:
        condiciones.append(AsambleaRegistro.numero_apartamento.ilike(f"%{apartamento}%"))
    if numero_control:
        condiciones.append(AsambleaRegistro.numero_control.ilike(f"%{numero_control}%"))
    
    if condiciones:
        query = query.filter(or_(*condiciones))
    
    # Ordenar por nombre y limitar resultados
    query = query.order_by(AsambleaRegistro.nombre).limit(limit)
    
    return query.all()

# Buscar registro que tiene un poder específico
def buscar_registro_con_poder(
    db: Session,
    asamblea_id: UUID,
    torre: str,
    apartamento: str,
    numero_control: str
):
    """
    Busca el registro que tiene un poder específico (torre, apartamento, numero_control).
    Busca en el campo gestion_poderes (JSONB) para encontrar el poder.
    """
    registros = db.query(AsambleaRegistro).filter(
        AsambleaRegistro.asamblea_id == asamblea_id,
        AsambleaRegistro.gestion_poderes.isnot(None)
    ).all()
    
    # Buscar en cada registro si tiene el poder
    for registro in registros:
        if not registro.gestion_poderes:
            continue
        
        # El formato puede ser: { "poder_1": {...}, "poder_2": {...} }
        poderes = registro.gestion_poderes
        if isinstance(poderes, dict):
            for poder_key, poder_data in poderes.items():
                if isinstance(poder_data, dict):
                    poder_torre = poder_data.get("torre") or poder_data.get("numero_torre") or ""
                    poder_apartamento = poder_data.get("apartamento") or poder_data.get("numero_apartamento") or ""
                    poder_control = poder_data.get("numero_control") or ""
                    
                    # Comparar valores (case-insensitive y sin espacios)
                    if (poder_torre.strip().lower() == torre.strip().lower() and
                        poder_apartamento.strip().lower() == apartamento.strip().lower() and
                        poder_control.strip().lower() == numero_control.strip().lower()):
                        return registro
    
    return None

# Buscar el dueño original de un poder (quien tiene esos datos como su poder_1)
def buscar_dueno_original_poder(
    db: Session,
    asamblea_id: UUID,
    torre: str,
    apartamento: str,
    numero_control: str
):
    """
    Busca el registro que tiene estos datos como su poder original (poder_1).
    El poder original de una persona es aquel que coincide con sus datos personales
    (numero_torre, numero_apartamento).
    Nota: No se compara numero_control porque el poder transferido puede tenerlo vacío.
    """
    # Buscar registros donde los datos coincidan con el poder
    registros = db.query(AsambleaRegistro).filter(
        AsambleaRegistro.asamblea_id == asamblea_id
    ).all()
    
    poder_torre = torre.strip().lower()
    poder_apartamento = apartamento.strip().lower()
    
    for registro in registros:
        # Comparar los datos del registro con el poder (solo torre y apartamento)
        registro_torre = (registro.numero_torre or "").strip().lower()
        registro_apartamento = (registro.numero_apartamento or "").strip().lower()
        
        # Si los datos coinciden (solo torre y apartamento), este es el dueño original
        if (registro_torre == poder_torre and
            registro_apartamento == poder_apartamento):
            return registro
    
    return None

# Actualizar un registro
def update_registro(
    db: Session,
    registro_id: UUID,
    gestion_poderes: Optional[dict] = None,
    actividad_ingreso: Optional[dict] = None,
    numero_control: Optional[str] = None,
    _numero_control_set_none: bool = False
):
    """
    Actualiza un registro.
    _numero_control_set_none: Si es True, establece numero_control a None explícitamente.
    """
    registro = get_registro_by_id(db, registro_id)
    if not registro:
        return None
    
    if gestion_poderes is not None:
        # Asegurar que siempre haya al menos poder_1, aunque esté vacío
        if not gestion_poderes or len(gestion_poderes) == 0:
            gestion_poderes = {"poder_1": {"torre": "", "apartamento": "", "numero_control": ""}}
        elif "poder_1" not in gestion_poderes:
            # Si no hay poder_1, agregarlo vacío al inicio
            nuevo_poderes = {"poder_1": {"torre": "", "apartamento": "", "numero_control": ""}}
            nuevo_poderes.update(gestion_poderes)
            gestion_poderes = nuevo_poderes
        
        registro.gestion_poderes = gestion_poderes
    if actividad_ingreso is not None:
        registro.actividad_ingreso = actividad_ingreso
    
    # Manejar numero_control: permitir establecer None explícitamente
    if _numero_control_set_none:
        registro.numero_control = None
    elif numero_control is not None:
        registro.numero_control = numero_control
    
    registro.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(registro)
    
    return registro

# Verificar si un número de control ya está asignado a otro registro
def verificar_control_existente(
    db: Session,
    asamblea_id: UUID,
    numero_control: str,
    registro_id_excluir: Optional[UUID] = None
):
    """
    Verifica si un número de control ya está asignado a otro registro en la misma asamblea.
    Retorna el registro que tiene ese control, o None si no existe.
    """
    query = db.query(AsambleaRegistro).filter(
        AsambleaRegistro.asamblea_id == asamblea_id,
        AsambleaRegistro.numero_control == numero_control.strip()
    )
    
    # Excluir el registro actual si se proporciona
    if registro_id_excluir:
        query = query.filter(AsambleaRegistro.id != registro_id_excluir)
    
    return query.first()

# Verificar si un número de control ya existe en algún poder de gestion_poderes
def verificar_control_en_poderes(
    db: Session,
    asamblea_id: UUID,
    numero_control: str,
    registro_id_excluir: Optional[UUID] = None
):
    """
    Verifica si un número de control ya existe en algún poder (gestion_poderes) de algún registro.
    Busca en todos los poderes (poder_1, poder_2, etc.) de todos los registros.
    Retorna el registro que tiene ese control en algún poder, o None si no existe.
    """
    numero_control_limpio = numero_control.strip()
    if not numero_control_limpio:
        return None
    
    # Obtener todos los registros de la asamblea que tengan gestion_poderes
    registros = db.query(AsambleaRegistro).filter(
        AsambleaRegistro.asamblea_id == asamblea_id,
        AsambleaRegistro.gestion_poderes.isnot(None)
    ).all()
    
    # Buscar en cada registro si algún poder tiene ese número de control
    for registro in registros:
        # Excluir el registro actual si se proporciona
        if registro_id_excluir and registro.id == registro_id_excluir:
            continue
        
        if not registro.gestion_poderes:
            continue
        
        # El formato es: { "poder_1": {...}, "poder_2": {...} }
        poderes = registro.gestion_poderes
        if isinstance(poderes, dict):
            for poder_key, poder_data in poderes.items():
                if isinstance(poder_data, dict):
                    poder_control = (poder_data.get("numero_control") or "").strip()
                    
                    # Comparar el número de control
                    if poder_control.lower() == numero_control_limpio.lower():
                        return registro
    
    return None

# Obtener estadísticas de ingreso por hora
def get_estadisticas_ingreso_por_hora(db: Session, asamblea_id: UUID):
    """
    Obtiene las estadísticas de ingreso agrupadas por hora.
    Solo cuenta actividades de tipo 'ingreso' o 'reingreso' del campo actividad_ingreso.
    Retorna un diccionario con la hora como clave y el conteo como valor.
    """
    registros = db.query(AsambleaRegistro).filter(
        AsambleaRegistro.asamblea_id == asamblea_id,
        AsambleaRegistro.actividad_ingreso.isnot(None)
    ).all()
    
    # Diccionario para almacenar conteos por hora
    conteo_por_hora = {}
    
    for registro in registros:
        if not registro.actividad_ingreso:
            continue
        
        actividad_ingreso = registro.actividad_ingreso
        if isinstance(actividad_ingreso, dict):
            # Iterar sobre todas las actividades (actividad_1, actividad_2, etc.)
            for actividad_key, actividad_data in actividad_ingreso.items():
                if isinstance(actividad_data, dict):
                    tipo = actividad_data.get("tipo", "").lower()
                    hora = actividad_data.get("hora", "")
                    
                    # Solo contar 'ingreso' o 'reingreso'
                    if tipo in ["ingreso", "reingreso"] and hora:
                        # Extraer solo la hora (formato esperado: "11:00AM", "2:30PM", etc.)
                        # Normalizar a formato HH:00 para agrupar por hora
                        try:
                            # Intentar parsear la hora
                            hora_normalizada = normalizar_hora(hora)
                            if hora_normalizada:
                                conteo_por_hora[hora_normalizada] = conteo_por_hora.get(hora_normalizada, 0) + 1
                        except:
                            # Si no se puede parsear, ignorar
                            continue
    
    return conteo_por_hora

def normalizar_hora(hora_str: str) -> Optional[str]:
    """
    Normaliza una hora en formato "11:00AM" o "2:30PM" a formato "HH:00".
    Extrae solo la hora (sin minutos) y la convierte a formato 24 horas.
    """
    if not hora_str:
        return None
    
    hora_str = hora_str.strip().upper()
    
    # Remover espacios y convertir a mayúsculas
    # Buscar el patrón: número(s) seguido de : y luego número(s) seguido de AM/PM
    # Patrón para encontrar hora en formato "11:00AM" o "2:30PM"
    patron = r'(\d{1,2}):(\d{2})\s*(AM|PM)'
    match = re.match(patron, hora_str)
    
    if not match:
        return None
    
    hora = int(match.group(1))
    minutos = int(match.group(2))
    periodo = match.group(3)
    
    # Convertir a formato 24 horas
    if periodo == "PM" and hora != 12:
        hora = hora + 12
    elif periodo == "AM" and hora == 12:
        hora = 0
    
    # Formatear como "HH:00" (solo la hora, sin minutos)
    return f"{hora:02d}:00"

# Verificar si un registro está presente
def esta_presente(actividad_ingreso: Optional[dict]) -> bool:
    """
    Verifica si un registro está presente basándose en su última actividad.
    Un registro está presente si su última actividad es 'ingreso' o 'reingreso'.
    """
    if not actividad_ingreso or not isinstance(actividad_ingreso, dict):
        return False
    
    # Obtener todas las actividades ordenadas por clave (actividad_1, actividad_2, etc.)
    actividades = []
    for key, value in actividad_ingreso.items():
        if isinstance(value, dict) and "tipo" in value:
            # Extraer el número de la actividad
            try:
                num = int(key.replace("actividad_", ""))
                actividades.append((num, value))
            except:
                continue
    
    # Si no hay actividades, no está presente
    if not actividades:
        return False
    
    # Ordenar por número y obtener la última actividad
    actividades.sort(key=lambda x: x[0])
    ultima_actividad = actividades[-1][1]
    
    tipo = ultima_actividad.get("tipo", "").lower()
    return tipo in ["ingreso", "reingreso"]

# Obtener estadísticas de quorum y coeficiente presente
def get_estadisticas_quorum_coeficiente(db: Session, asamblea_id: UUID):
    """
    Obtiene las estadísticas de quorum y coeficiente presente.
    
    Retorna:
    - total_registros: Total de registros en la asamblea
    - registros_presentes: Cantidad de registros presentes
    - total_coeficiente: Suma de todos los coeficientes de la columna coeficiente
    - coeficiente_presente: Suma de coeficientes de registros presentes (coeficiente propio + poderes)
    """
    # Obtener todos los registros de la asamblea
    registros = db.query(AsambleaRegistro).filter(
        AsambleaRegistro.asamblea_id == asamblea_id
    ).all()
    
    total_registros = len(registros)
    registros_presentes = 0
    total_coeficiente = 0.0
    coeficiente_presente = 0.0
    
    # Calcular total_coeficiente: suma de todos los valores de la columna coeficiente
    for registro in registros:
        if registro.coeficiente is not None:
            total_coeficiente += float(registro.coeficiente)
    
    # Calcular coeficiente_presente: para registros presentes, suma su coeficiente + poderes
    for registro in registros:
        # Verificar si está presente
        if esta_presente(registro.actividad_ingreso):
            registros_presentes += 1
            
            # Calcular coeficiente del registro presente (su propio coeficiente + poderes)
            coeficiente_registro_presente = 0.0
            
            # Sumar el coeficiente propio del registro
            if registro.coeficiente is not None:
                coeficiente_registro_presente += float(registro.coeficiente)
            
            # Sumar coeficientes de los poderes en gestion_poderes
            # EXCLUIR poder_1 porque es el poder propio de la persona y ya se contó en el coeficiente propio
            if registro.gestion_poderes and isinstance(registro.gestion_poderes, dict):
                for poder_key, poder_data in registro.gestion_poderes.items():
                    # Saltar poder_1 porque es el poder propio de la persona
                    if poder_key == "poder_1":
                        continue
                    
                    if isinstance(poder_data, dict):
                        # Obtener datos del poder
                        torre = poder_data.get("torre") or poder_data.get("numero_torre") or ""
                        apartamento = poder_data.get("apartamento") or poder_data.get("numero_apartamento") or ""
                        numero_control = poder_data.get("numero_control") or ""
                        
                        # Si el poder tiene datos válidos, buscar el coeficiente del dueño original
                        if torre.strip() or apartamento.strip():
                            dueno_original = buscar_dueno_original_poder(
                                db=db,
                                asamblea_id=asamblea_id,
                                torre=torre.strip(),
                                apartamento=apartamento.strip(),
                                numero_control=numero_control.strip()
                            )
                            
                            if dueno_original and dueno_original.coeficiente is not None:
                                coeficiente_registro_presente += float(dueno_original.coeficiente)
            
            # Sumar al coeficiente presente
            coeficiente_presente += coeficiente_registro_presente
    
    return {
        "total_registros": total_registros,
        "registros_presentes": registros_presentes,
        "total_coeficiente": total_coeficiente,
        "coeficiente_presente": coeficiente_presente
    }
