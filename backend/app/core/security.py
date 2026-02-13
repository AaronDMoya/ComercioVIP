from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from app.core.config import SECRET_KEY, ALGORITHM

# - HASHING DE CONTRASEÑAS -

# Contexto de contraseñas
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Función para hash de contraseña
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)

# - TOKENS JWT (Acceso) -

# Función para crear un token de acceso
def create_access_token(data: dict, minutes_expire: int):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=minutes_expire)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# Función para decodificar un token
def decode_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])