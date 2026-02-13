import os
from dotenv import load_dotenv

load_dotenv()

# Variables acceso a la base de datos
RDSHOST = os.getenv("RDSHOST")
DB_NAME = os.getenv("DB_NAME")
PORT = os.getenv("PORT")
USER = os.getenv("USER")
PASSWORD = os.getenv("PASSWORD")

# Variables de seguridad de Tokens JWT
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")

# Variables de configuración CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")