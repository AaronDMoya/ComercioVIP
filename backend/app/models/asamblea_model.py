from sqlalchemy import Column, String, Text, TIMESTAMP, ForeignKey, Numeric, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

# Modelo de asamblea
class Asamblea(Base):
    __tablename__ = "asambleas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    estado = Column(String(20), nullable=False, default="CREADA")
    fecha_inicio = Column(TIMESTAMP(timezone=True), nullable=True)
    fecha_final = Column(TIMESTAMP(timezone=True), nullable=True)
    created_by = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)

    # Relación con registros
    registros = relationship("AsambleaRegistro", back_populates="asamblea", cascade="all, delete-orphan")

# Modelo de registro de asamblea
class AsambleaRegistro(Base):
    __tablename__ = "asamblea_registros"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asamblea_id = Column(UUID(as_uuid=True), ForeignKey("asambleas.id", ondelete="CASCADE"), nullable=False)
    cedula = Column(String(20), nullable=False)
    nombre = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=True)
    numero_torre = Column(String(10), nullable=True)
    numero_apartamento = Column(String(10), nullable=True)
    numero_control = Column(String(20), nullable=True)
    coeficiente = Column(Numeric(10, 4), nullable=True)
    actividad_ingreso = Column(JSONB, nullable=True)
    gestion_poderes = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)

    # Relación con asamblea
    asamblea = relationship("Asamblea", back_populates="registros")
