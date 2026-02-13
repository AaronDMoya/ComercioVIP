from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db, test_connection

router = APIRouter(prefix="/health", tags=["health"])

# Endpoint para probar la salud de la API.
@router.get("/")
def health():
    return {"status": "backend is running"}

# Endpoint para probar la conexión a la base de datos.
@router.get("/db")
def health_db(db: Session = Depends(get_db)):
    try:
        # Probar conexión básica usando la función de database.py
        if not test_connection():
            raise HTTPException(
                status_code=503,
                detail="No se pudo establecer conexión con la base de datos"
            )
        
        # Probar que la sesión también funciona (lo que usaremos en la app)
        db.execute(text("SELECT 1"))
        
        return {"status": "Connection to the database is successfull"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error al conectar con la base de datos: {str(e)}"
        )