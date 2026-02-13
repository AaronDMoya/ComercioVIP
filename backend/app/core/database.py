from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import RDSHOST, DB_NAME, PORT, PASSWORD, USER

# Construccion de URL con validación
if not all([USER, PASSWORD, RDSHOST, DB_NAME, PORT]):
    raise ValueError("Faltan variables de entorno requeridas para la conexión a la base de datos: USER, PASSWORD, RDSHOST, DB_NAME, PORT")

DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{RDSHOST}:{PORT}/{DB_NAME}"

# Crear el motor de SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Crear la clase base para los modelos
Base = declarative_base()

# Crear la fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Generador de dependencia para obtener una sesión de base de datos.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para probar la conexión a la base de datos.
def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            return True
    except Exception as e:
        print(f"Error de conexión: {e}")
        return False
