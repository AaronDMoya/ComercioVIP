"""
Script de prueba para verificar la conexión a la base de datos.
Ejecutar desde la raíz del proyecto con: python -m test.test_database_connection
"""
import sys
import os

# Agregar el directorio raíz al path para importar los módulos de app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.core.database import test_connection, engine, SessionLocal
from app.core.config import RDSHOST, DB_NAME, PORT, USER


def main():
    """
    Función principal que ejecuta las pruebas de conexión.
    """
    print("=" * 50)
    print("PRUEBA DE CONEXION A LA BASE DE DATOS")
    print("=" * 50)
    print(f"\nConfiguración:")
    print(f"  Host: {RDSHOST}")
    print(f"  Puerto: {PORT}")
    print(f"  Base de datos: {DB_NAME}")
    print(f"  Usuario: {USER}")
    print("\n" + "-" * 50)
    
    # Prueba 1: Verificar conexión básica
    print("\n[Prueba 1] Verificando conexion basica...")
    if test_connection():
        print("[OK] Conexion exitosa!")
    else:
        print("[ERROR] No se pudo conectar a la base de datos")
        return False
    
    # Prueba 2: Verificar que se puede crear una sesión
    print("\n[Prueba 2] Verificando creacion de sesion...")
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("[OK] Sesion creada y cerrada correctamente!")
    except Exception as e:
        print(f"[ERROR] Error al crear sesion: {e}")
        return False
    
    # Prueba 3: Verificar información de la base de datos
    print("\n[Prueba 3] Obteniendo informacion de la base de datos...")
    try:
        with engine.connect() as connection:
            # Obtener versión de PostgreSQL
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"[OK] Version de PostgreSQL: {version.split(',')[0]}")
            
            # Obtener nombre de la base de datos actual
            result = connection.execute(text("SELECT current_database()"))
            current_db = result.fetchone()[0]
            print(f"[OK] Base de datos actual: {current_db}")
    except Exception as e:
        print(f"[ERROR] Error al obtener informacion: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("[OK] TODAS LAS PRUEBAS PASARON EXITOSAMENTE")
    print("=" * 50)
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
