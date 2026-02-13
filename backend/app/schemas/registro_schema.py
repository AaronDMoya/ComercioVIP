from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any
from datetime import datetime

# Esquema para respuesta de registro
class RegistroResponse(BaseModel):
    id: UUID
    asamblea_id: UUID
    cedula: str
    nombre: str
    telefono: Optional[str]
    numero_torre: Optional[str]
    numero_apartamento: Optional[str]
    numero_control: Optional[str]
    coeficiente: Optional[float]
    actividad_ingreso: Optional[Dict[str, Any]]
    gestion_poderes: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Esquema para actualizar registro
class RegistroUpdate(BaseModel):
    gestion_poderes: Optional[Dict[str, Any]] = None
    actividad_ingreso: Optional[Dict[str, Any]] = None
    numero_control: Optional[str] = None

# Esquema para buscar poderes (autocompletado)
class PoderSearchParams(BaseModel):
    torre: Optional[str] = None
    apartamento: Optional[str] = None
    numero_control: Optional[str] = None
