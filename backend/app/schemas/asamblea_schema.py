from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime

# Esquema para crear un registro de asamblea
class RegistroCreate(BaseModel):
    cedula: str
    nombre: str
    telefono: Optional[str] = None
    numero_torre: Optional[str] = None
    numero_apartamento: Optional[str] = None
    numero_control: Optional[str] = None
    coeficiente: Optional[float] = None

# Esquema para crear una asamblea
class AsambleaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    estado: str = "CREADA"  # CREADA, ACTIVA, CERRADA
    registros: List[RegistroCreate] = []

# Esquema para actualizar el estado de una asamblea
class AsambleaUpdateEstado(BaseModel):
    estado: str  # CREADA, ACTIVA, CERRADA

# Esquema para respuesta de asamblea
class AsambleaResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    estado: str
    fecha_inicio: Optional[datetime]
    fecha_final: Optional[datetime]
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
