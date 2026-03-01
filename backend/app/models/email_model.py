"""
Modelo para la tabla emails. Registra cada envío de correo (reporte control, etc.).
"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid


class Email(Base):
    __tablename__ = "emails"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asamblea_id = Column(
        UUID(as_uuid=True),
        ForeignKey("asambleas.id", ondelete="CASCADE"),
        nullable=False,
    )
    destinatario = Column(String(255), nullable=False)
    estado = Column(String(20), nullable=False, default="PENDIENTE")  # PENDIENTE, ENVIADO, ERROR
    tipo = Column(String(50), nullable=False)  # REPORTE CONTROL, ENVIO QR, ACTUALIZACION
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)
    id_sendgrid = Column(String(255), nullable=True)
