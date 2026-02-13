"""
Script para migrar actividad_ingreso y gestion_poderes de formato plano a formato anidado
Cambia de:
{
    "torre": "2", 
    "apartamento": "521", 
    "numero_control": ""
}
a:
{
    "poder_1": {
        "torre": "2", 
        "apartamento": "521", 
        "numero_control": ""
    }
}
"""
import sys
import os
from pathlib import Path

# Agregar el directorio raíz del proyecto al path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.asamblea_model import AsambleaRegistro
import json
from typing import Dict, Any

def is_old_format(actividad_ingreso: Dict[str, Any]) -> bool:
    """
    Verifica si el formato es el antiguo (plano)
    """
    if not actividad_ingreso:
        return False
    
    # Si ya tiene poder_1, poder_2, etc., es el nuevo formato
    if any(key.startswith('poder_') for key in actividad_ingreso.keys()):
        return False
    
    # Si tiene torre, apartamento o numero_control directamente, es el formato antiguo
    # Verificar que NO tenga ninguna clave que empiece con "poder_"
    has_poder_keys = any(key.startswith('poder_') for key in actividad_ingreso.keys())
    has_old_format_keys = 'torre' in actividad_ingreso or 'apartamento' in actividad_ingreso or 'numero_control' in actividad_ingreso
    
    # Es formato antiguo si tiene las claves antiguas Y no tiene claves de poder
    return has_old_format_keys and not has_poder_keys

def convert_to_new_format(old_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convierte el formato antiguo al nuevo formato anidado
    """
    return {
        "poder_1": {
            "torre": old_data.get("torre", ""),
            "apartamento": old_data.get("apartamento", ""),
            "numero_control": old_data.get("numero_control", "")
        }
    }

def migrate_gestion_poderes(db: Session) -> tuple[int, int]:
    """
    Migra todos los registros con gestion_poderes en formato antiguo al nuevo formato
    
    Returns:
        tuple: (registros_actualizados, registros_con_error)
    """
    updated_count = 0
    error_count = 0
    
    try:
        from sqlalchemy import text
        
        # Buscar registros con formato antiguo usando consulta JSONB
        print("\n" + "=" * 60)
        print("Migrando gestion_poderes...")
        print("=" * 60)
        
        result = db.execute(text("""
            SELECT id, gestion_poderes
            FROM asamblea_registros 
            WHERE gestion_poderes IS NOT NULL
            AND jsonb_typeof(gestion_poderes) = 'object'
            AND (
                (gestion_poderes ? 'torre' AND NOT gestion_poderes ? 'poder_1')
                OR (gestion_poderes ? 'apartamento' AND NOT gestion_poderes ? 'poder_1')
                OR (gestion_poderes ? 'numero_control' AND NOT gestion_poderes ? 'poder_1')
            )
        """))
        
        registros_a_migrar = result.fetchall()
        print(f"Registros de gestion_poderes que necesitan migración: {len(registros_a_migrar)}")
        print("=" * 60)
        
        for row in registros_a_migrar:
            registro_id = row[0]
            gestion_poderes = row[1]
            
            try:
                # Verificar si es el formato antiguo
                if is_old_format(gestion_poderes):
                    # Convertir al nuevo formato
                    nuevo_formato = convert_to_new_format(gestion_poderes)
                    
                    # Actualizar el registro usando SQL directo con jsonb_build_object
                    db.execute(text("""
                        UPDATE asamblea_registros 
                        SET gestion_poderes = jsonb_build_object('poder_1', gestion_poderes)
                        WHERE id = :registro_id
                    """), {
                        "registro_id": registro_id
                    })
                    
                    updated_count += 1
                    print(f"[{updated_count}] Registro ID: {registro_id} - gestion_poderes Actualizado")
                    print(f"    Antes: {json.dumps(gestion_poderes, ensure_ascii=False)}")
                    print(f"    Después: {json.dumps(nuevo_formato, ensure_ascii=False)}")
                    print()
                    
            except Exception as e:
                error_count += 1
                print(f"[ERROR] Registro ID: {registro_id} - Error: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        return updated_count, error_count
    
    except Exception as e:
        print(f"\n[ERROR CRÍTICO] Error durante la migración de gestion_poderes: {str(e)}")
        raise

def migrate_actividad_ingreso(db: Session) -> tuple[int, int]:
    """
    Migra todos los registros con actividad_ingreso en formato antiguo al nuevo formato
    
    Returns:
        tuple: (registros_actualizados, registros_con_error)
    """
    updated_count = 0
    error_count = 0
    
    try:
        from sqlalchemy import text
        
        # Primero, ver todos los registros y sus formatos
        print("Consultando TODOS los registros con actividad_ingreso...")
        result = db.execute(text("""
            SELECT id, actividad_ingreso::text as actividad_text
            FROM asamblea_registros 
            WHERE actividad_ingreso IS NOT NULL
            LIMIT 20
        """))
        
        sample_records = result.fetchall()
        print(f"Registros encontrados: {len(sample_records)}")
        print("=" * 60)
        
        for row in sample_records:
            registro_id = row[0]
            actividad_text = row[1]
            print(f"Registro ID: {registro_id}")
            print(f"  JSON Text: {actividad_text}")
            print()
        
        # Ahora buscar registros con formato antiguo usando consulta JSONB
        print("\nBuscando registros con formato antiguo...")
        result = db.execute(text("""
            SELECT id, actividad_ingreso
            FROM asamblea_registros 
            WHERE actividad_ingreso IS NOT NULL
            AND jsonb_typeof(actividad_ingreso) = 'object'
            AND (
                (actividad_ingreso ? 'torre' AND NOT actividad_ingreso ? 'poder_1')
                OR (actividad_ingreso ? 'apartamento' AND NOT actividad_ingreso ? 'poder_1')
                OR (actividad_ingreso ? 'numero_control' AND NOT actividad_ingreso ? 'poder_1')
            )
        """))
        
        registros_a_migrar = result.fetchall()
        print(f"Registros que necesitan migración: {len(registros_a_migrar)}")
        print("=" * 60)
        
        for row in registros_a_migrar:
            registro_id = row[0]
            actividad_ingreso = row[1]
            
            try:
                # Verificar si es el formato antiguo
                if is_old_format(actividad_ingreso):
                    # Convertir al nuevo formato
                    nuevo_formato = convert_to_new_format(actividad_ingreso)
                    
                    # Actualizar el registro usando SQL directo con jsonb_build_object
                    db.execute(text("""
                        UPDATE asamblea_registros 
                        SET actividad_ingreso = jsonb_build_object('poder_1', actividad_ingreso)
                        WHERE id = :registro_id
                    """), {
                        "registro_id": registro_id
                    })
                    
                    updated_count += 1
                    print(f"[{updated_count}] Registro ID: {registro_id} - Actualizado")
                    print(f"    Antes: {json.dumps(actividad_ingreso, ensure_ascii=False)}")
                    print(f"    Después: {json.dumps(nuevo_formato, ensure_ascii=False)}")
                    print()
                    
            except Exception as e:
                error_count += 1
                print(f"[ERROR] Registro ID: {registro_id} - Error: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        # Hacer commit de todos los cambios
        if updated_count > 0:
            db.commit()
            print("\n" + "=" * 60)
            print(f"✓ Cambios guardados en la base de datos")
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR CRÍTICO] Error durante la migración: {str(e)}")
        raise
    
    return updated_count, error_count

def main():
    """
    Función principal que ejecuta la migración
    """
    print("=" * 60)
    print("Migración: Formato plano → Formato anidado")
    print("Columnas: actividad_ingreso y gestion_poderes")
    print("=" * 60)
    print()
    
    # Obtener sesión de base de datos
    db: Session = next(get_db())
    
    try:
        # Migrar actividad_ingreso
        updated_actividad, errors_actividad = migrate_actividad_ingreso(db)
        
        # Migrar gestion_poderes
        updated_poderes, errors_poderes = migrate_gestion_poderes(db)
        
        # Hacer commit de todos los cambios
        if updated_actividad > 0 or updated_poderes > 0:
            db.commit()
            print("\n" + "=" * 60)
            print(f"✓ Cambios guardados en la base de datos")
        
        print("\n" + "=" * 60)
        print("Resumen de la migración:")
        print(f"  ✓ actividad_ingreso actualizados: {updated_actividad}")
        if errors_actividad > 0:
            print(f"  ✗ actividad_ingreso con error: {errors_actividad}")
        print(f"  ✓ gestion_poderes actualizados: {updated_poderes}")
        if errors_poderes > 0:
            print(f"  ✗ gestion_poderes con error: {errors_poderes}")
        print(f"  ✓ Total actualizados: {updated_actividad + updated_poderes}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] La migración falló: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
