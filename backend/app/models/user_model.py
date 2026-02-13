from sqlalchemy import Column, String, Boolean, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid

# Modelo de usuario
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    username = Column(String(50), unique=True, nullable=False)
    password = Column(String, nullable=False)

    is_admin = Column(Boolean, default=False)

    created_at = Column(TIMESTAMP, server_default=text("now()"))
    updated_at = Column(TIMESTAMP, server_default=text("now()"))