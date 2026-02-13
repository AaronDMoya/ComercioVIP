from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import RDSHOST, DB_NAME, PORT, PASSWORD, USER
import logging

logger = logging.getLogger(__name__)

# Función para construir la URL de la base de datos
def get_database_url():
    """Construye la URL de la base de datos validando las variables de entorno"""
    if not all([USER, PASSWORD, RDSHOST, DB_NAME, PORT]):
        missing = [var for var, val in [
            ("USER", USER), ("PASSWORD", PASSWORD), ("RDSHOST", RDSHOST), 
            ("DB_NAME", DB_NAME), ("PORT", PORT)
        ] if not val]
        raise ValueError(
            f"Faltan variables de entorno requeridas para la conexión a la base de datos: {', '.join(missing)}"
        )
    return f"postgresql://{USER}:{PASSWORD}@{RDSHOST}:{PORT}/{DB_NAME}"

# Intentar crear el motor de SQLAlchemy
# Si faltan variables, se creará un engine None y se validará cuando se use
engine = None
try:
    DATABASE_URL = get_database_url()
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
    logger.info("Motor de base de datos creado exitosamente")
except ValueError as e:
    logger.warning(f"No se pudo crear el motor de base de datos: {e}")
    logger.info("El servidor iniciará, pero las funciones de BD no estarán disponibles hasta configurar las variables de entorno")

# Crear la clase base para los modelos
Base = declarative_base()

# Crear la fábrica de sesiones (solo si el engine existe)
SessionLocal = None
if engine:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Generador de dependencia para obtener una sesión de base de datos.
def get_db():
    if not engine or not SessionLocal:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no configurada. Verifique las variables de entorno."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para probar la conexión a la base de datos.
def test_connection():
    if not engine:
        logger.error("Motor de base de datos no está disponible")
        return False
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            return True
    except Exception as e:
        logger.error(f"Error de conexión: {e}")
        return False
