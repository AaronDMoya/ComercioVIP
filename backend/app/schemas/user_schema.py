from pydantic import BaseModel
from uuid import UUID
from typing import Optional

# Esquema para crear un usuario
class UserCreate(BaseModel):
    name: str
    last_name: str
    username: str
    password: str
    is_admin: bool = False  # Por defecto es False (operario)

# Esquema para login de usuario
class UserLogin(BaseModel):
    username: str
    password: str

# Esquema para actualizar un usuario
class UserUpdate(BaseModel):
    name: str
    last_name: str
    username: str
    is_admin: bool
    new_password: Optional[str] = None

# Esquema para obtener un usuario
class UserResponse(BaseModel):
    id: UUID
    name: str
    last_name: str
    username: str
    is_admin: bool

    class Config:
        from_attributes = True