"""Schemas para flujo público de actualización de datos (sin auth)."""
from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class IngresoRequest(BaseModel):
    asamblea_id: UUID
    numero_torre: str
    numero_apartamento: str


class IngresoResponse(BaseModel):
    token: str


class RegistroPublicResponse(BaseModel):
    """Datos del registro visibles para actualización (sin actividad, poderes, etc.)."""
    id: UUID
    asamblea_id: UUID
    asamblea_title: str
    cedula: str
    nombre: str
    telefono: Optional[str]
    correo: Optional[str]
    numero_torre: Optional[str]
    numero_apartamento: Optional[str]


class RegistroActualizarRequest(BaseModel):
    token: str
    cedula: Optional[str] = None
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
