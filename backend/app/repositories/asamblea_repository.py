from sqlalchemy.orm import Session
from app.models.asamblea_model import Asamblea, AsambleaRegistro
from uuid import UUID
from typing import List, Optional

# Crear una asamblea con sus registros
def create_asamblea_with_registros(db: Session, asamblea_data: dict, registros_data: List[dict], created_by: str):
    # Crear la asamblea
    asamblea = Asamblea(
        title=asamblea_data["title"],
        description=asamblea_data.get("description"),
        estado=asamblea_data.get("estado", "CREADA"),
        created_by=created_by
    )
    
    db.add(asamblea)
    db.flush()  # Para obtener el ID de la asamblea
    
    # Crear los registros
    registros = []
    for registro_data in registros_data:
        # Construir gestion_poderes en formato anidado con poder_1
        # Formato: {"poder_1": {"torre": "...", "apartamento": "...", "numero_control": "..."}}
        gestion_poderes = {
            "poder_1": {
                "torre": registro_data.get("numero_torre", ""),
                "apartamento": registro_data.get("numero_apartamento", ""),
                "numero_control": registro_data.get("numero_control", "")
            }
        }
        
        registro = AsambleaRegistro(
            asamblea_id=asamblea.id,
            cedula=registro_data["cedula"],
            nombre=registro_data["nombre"],
            telefono=registro_data.get("telefono"),
            numero_torre=registro_data.get("numero_torre"),
            numero_apartamento=registro_data.get("numero_apartamento"),
            numero_control=registro_data.get("numero_control"),
            coeficiente=registro_data.get("coeficiente"),
            actividad_ingreso=None,  # Dejarlo vacío como se pidió
            gestion_poderes=gestion_poderes
        )
        registros.append(registro)
    
    db.add_all(registros)
    db.commit()
    db.refresh(asamblea)
    
    return asamblea

# Obtener una asamblea por ID
def get_asamblea_by_id(db: Session, asamblea_id: UUID):
    return db.query(Asamblea).filter(Asamblea.id == asamblea_id).first()

# Obtener todas las asambleas
def get_all_asambleas(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, estado: Optional[str] = None, fecha_desde: Optional[str] = None, fecha_hasta: Optional[str] = None):
    from datetime import datetime
    
    query = db.query(Asamblea)
    
    # Filtro de búsqueda por título o descripción
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Asamblea.title.ilike(search_filter)) |
            (Asamblea.description.ilike(search_filter))
        )
    
    # Filtro por estado
    if estado:
        query = query.filter(Asamblea.estado == estado)
    
    # Filtro por fecha desde
    if fecha_desde:
        try:
            # El formato viene como YYYY-MM-DD, convertir a datetime
            fecha_desde_dt = datetime.strptime(fecha_desde, "%Y-%m-%d")
            query = query.filter(Asamblea.created_at >= fecha_desde_dt)
        except:
            pass
    
    # Filtro por fecha hasta
    if fecha_hasta:
        try:
            # El formato viene como YYYY-MM-DD, convertir a datetime y agregar 23:59:59 para incluir todo el día
            fecha_hasta_dt = datetime.strptime(fecha_hasta, "%Y-%m-%d")
            from datetime import time
            fecha_hasta_dt = datetime.combine(fecha_hasta_dt.date(), time(23, 59, 59))
            query = query.filter(Asamblea.created_at <= fecha_hasta_dt)
        except:
            pass
    
    # Ordenar por fecha de creación descendente
    query = query.order_by(Asamblea.created_at.desc())
    
    return query.offset(skip).limit(limit).all()

# Contar asambleas con filtros
def count_asambleas(db: Session, search: Optional[str] = None, estado: Optional[str] = None, fecha_desde: Optional[str] = None, fecha_hasta: Optional[str] = None):
    from datetime import datetime
    
    query = db.query(Asamblea)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Asamblea.title.ilike(search_filter)) |
            (Asamblea.description.ilike(search_filter))
        )
    
    if estado:
        query = query.filter(Asamblea.estado == estado)
    
    # Filtro por fecha desde
    if fecha_desde:
        try:
            # El formato viene como YYYY-MM-DD, convertir a datetime
            fecha_desde_dt = datetime.strptime(fecha_desde, "%Y-%m-%d")
            query = query.filter(Asamblea.created_at >= fecha_desde_dt)
        except:
            pass
    
    # Filtro por fecha hasta
    if fecha_hasta:
        try:
            # El formato viene como YYYY-MM-DD, convertir a datetime y agregar 23:59:59 para incluir todo el día
            fecha_hasta_dt = datetime.strptime(fecha_hasta, "%Y-%m-%d")
            from datetime import time
            fecha_hasta_dt = datetime.combine(fecha_hasta_dt.date(), time(23, 59, 59))
            query = query.filter(Asamblea.created_at <= fecha_hasta_dt)
        except:
            pass
    
    return query.count()

# Actualizar el estado de una asamblea
def update_asamblea_estado(db: Session, asamblea_id: UUID, nuevo_estado: str):
    """
    Actualiza el estado de una asamblea.
    Valida las transiciones permitidas:
    - CREADA -> ACTIVA
    - ACTIVA -> CERRADA
    """
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        return None
    
    estado_actual = asamblea.estado
    estados_permitidos = ["CREADA", "ACTIVA", "CERRADA"]
    
    # Validar que el nuevo estado sea válido
    if nuevo_estado not in estados_permitidos:
        raise ValueError(f"Estado inválido: {nuevo_estado}")
    
    # Validar transiciones permitidas
    if estado_actual == "CREADA" and nuevo_estado != "ACTIVA":
        raise ValueError("Una asamblea CREADA solo puede cambiar a ACTIVA")
    
    if estado_actual == "ACTIVA" and nuevo_estado != "CERRADA":
        raise ValueError("Una asamblea ACTIVA solo puede cambiar a CERRADA")
    
    if estado_actual == "CERRADA":
        raise ValueError("Una asamblea CERRADA no puede cambiar de estado")
    
    # Actualizar el estado
    asamblea.estado = nuevo_estado
    
    # Si se activa, establecer fecha_inicio si no está establecida
    if nuevo_estado == "ACTIVA" and asamblea.fecha_inicio is None:
        from datetime import datetime
        asamblea.fecha_inicio = datetime.utcnow()
    
    # Si se cierra, establecer fecha_final si no está establecida
    if nuevo_estado == "CERRADA" and asamblea.fecha_final is None:
        from datetime import datetime
        asamblea.fecha_final = datetime.utcnow()
    
    from datetime import datetime
    asamblea.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(asamblea)
    
    return asamblea

# Eliminar una asamblea (también elimina sus registros por CASCADE)
def delete_asamblea(db: Session, asamblea_id: UUID):
    """
    Elimina una asamblea y todos sus registros asociados.
    La eliminación en cascada se maneja automáticamente por la base de datos.
    """
    asamblea = get_asamblea_by_id(db, asamblea_id)
    if not asamblea:
        return False
    
    db.delete(asamblea)
    db.commit()
    
    return True