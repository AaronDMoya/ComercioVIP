from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.schemas.user_schema import UserCreate, UserResponse, UserUpdate
from app.repositories.user_repository import get_by_username, create_user, get_all_users, count_users, get_by_id, update_user, delete_user
from app.core.security import hash_password, verify_password
from app.models.user_model import User
from app.schemas.user_schema import UserLogin
from typing import List, Optional

# Servicio para crear un usuario
def create_new_user(db: Session, data_user: UserCreate):
    if get_by_username(db, data_user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username already exists"
        )

    user = User(
        name=data_user.name,
        last_name=data_user.last_name,
        username=data_user.username,
        password=hash_password(data_user.password),
        is_admin=data_user.is_admin,
    )

    return create_user(db, user)

# Servicio para login de usuario
def login_user(db: Session, data_user: UserLogin):
    user = get_by_username(db, data_user.username)

    if not user:
        return None

    if not verify_password(data_user.password, user.password):
        return None

    return user

# Servicio para obtener todos los usuarios con filtros
def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_admin: Optional[bool] = None
):
    users = get_all_users(db, skip=skip, limit=limit, search=search, is_admin=is_admin)
    total = count_users(db, search=search, is_admin=is_admin)
    
    return {
        "users": users,
        "total": total
    }

# Servicio para actualizar un usuario
def update_existing_user(db: Session, user_id, data_user: UserUpdate):
    # Verificar si el usuario existe
    user = get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verificar si el username ya existe en otro usuario
    existing_user = get_by_username(db, data_user.username)
    if existing_user and existing_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Preparar los datos para actualizar
    user_data = {
        "name": data_user.name,
        "last_name": data_user.last_name,
        "username": data_user.username,
        "is_admin": data_user.is_admin,
    }
    
    # Actualizar contraseña si se proporciona
    if data_user.new_password:
        user_data["password"] = hash_password(data_user.new_password)
    
    return update_user(db, user_id, user_data)

# Servicio para eliminar un usuario
def delete_existing_user(db: Session, user_id):
    # Verificar si el usuario existe
    user = get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return delete_user(db, user_id)