from sqlalchemy.orm import Session
from app.models.user_model import User
from uuid import UUID
from typing import List, Optional

# Obtener un usuario por username
def get_by_username(db: Session, username: str):
    return db.query(User)\
        .filter(User.username == username)\
        .first()

# Obtener un usuario por ID
def get_by_id(db: Session, user_id: UUID):
    return db.query(User)\
        .filter(User.id == user_id)\
        .first()

# Obtener todos los usuarios
def get_all_users(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, is_admin: Optional[bool] = None):
    query = db.query(User)
    
    # Filtro de búsqueda por nombre, apellido o username
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.username.ilike(search_filter))
        )
    
    # Filtro por rol (admin/operario)
    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)
    
    # Ordenar por nombre
    query = query.order_by(User.name, User.last_name)
    
    return query.offset(skip).limit(limit).all()

# Contar usuarios con filtros
def count_users(db: Session, search: Optional[str] = None, is_admin: Optional[bool] = None):
    query = db.query(User)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.username.ilike(search_filter))
        )
    
    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)
    
    return query.count()

# Crear un usuario
def create_user(db: Session, user: User):
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Actualizar un usuario
def update_user(db: Session, user_id: UUID, user_data: dict):
    user = get_by_id(db, user_id)
    if not user:
        return None
    
    # Actualizar los campos
    for key, value in user_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

# Eliminar un usuario
def delete_user(db: Session, user_id: UUID):
    user = get_by_id(db, user_id)
    if not user:
        return False
    
    db.delete(user)
    db.commit()
    return True