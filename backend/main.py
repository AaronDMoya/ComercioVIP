from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router
from app.core.database import engine, Base
from app.core.config import CORS_ORIGINS
from app.models.user_model import User
from app.models.asamblea_model import Asamblea, AsambleaRegistro
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="API", version="1.0.0")

# Configuración de CORS (configurable mediante variable de entorno CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Orígenes permitidos del frontend (configurable)
    allow_credentials=True,  # Permite cookies
    allow_methods=["*"],  # Permite todos los métodos HTTP
    allow_headers=["*"],  # Permite todos los headers
)

# Evento de inicio: crear tablas de la base de datos
@app.on_event("startup")
async def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de la base de datos creadas/verificadas exitosamente")
    except Exception as e:
        logger.warning(f"No se pudieron crear las tablas al iniciar: {e}")
        logger.info("El servidor continuará, pero las tablas deben crearse manualmente o cuando la conexión esté disponible")

app.include_router(router)