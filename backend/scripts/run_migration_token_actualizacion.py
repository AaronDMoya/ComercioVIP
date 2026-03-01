"""
Ejecuta la migración que añade la columna token_actualizacion a asamblea_registros.

Desde la carpeta backend, con el entorno virtual activado:
  python scripts/run_migration_token_actualizacion.py

Si usas un venv:  .\ev\Scripts\activate   (Windows) o  source ev/bin/activate   (Linux/Mac)
"""
import os
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))
os.chdir(backend_root)

from dotenv import load_dotenv
load_dotenv(backend_root / ".env")


def main():
    from sqlalchemy import text
    from app.core.database import engine

    if not engine:
        print("ERROR: No se pudo conectar a la base de datos. Revisa las variables de entorno.")
        sys.exit(1)

    statements = [
        "ALTER TABLE public.asamblea_registros ADD COLUMN IF NOT EXISTS token_actualizacion varchar(255) NULL",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_asamblea_registros_token_actualizacion ON public.asamblea_registros (token_actualizacion) WHERE token_actualizacion IS NOT NULL",
    ]

    try:
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
        print("Migración aplicada correctamente: columna token_actualizacion añadida a asamblea_registros.")
    except Exception as e:
        print(f"ERROR al ejecutar la migración: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
