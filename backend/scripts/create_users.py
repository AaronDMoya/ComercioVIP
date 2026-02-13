"""
Script para crear usuarios de prueba usando la API
"""
import urllib.request
import urllib.parse
import json
from typing import Dict

# URL base de la API
API_URL = "http://localhost:8000"

# Lista de nombres y apellidos para generar usuarios
nombres = [
    "Juan", "María", "Carlos", "Ana", "Luis", "Laura", "Miguel", "Sofía",
    "Pedro", "Carmen", "Diego", "Patricia", "Andrés", "Lucía", "Fernando",
    "Isabel", "Roberto", "Elena", "Javier", "Mónica"
]

apellidos = [
    "García", "Rodríguez", "González", "Fernández", "López", "Martínez",
    "Sánchez", "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández",
    "Díaz", "Moreno", "Álvarez", "Muñoz", "Romero", "Alonso", "Gutiérrez"
]

def create_user(name: str, last_name: str, username: str, password: str, is_admin: bool = False) -> Dict:
    """
    Crea un usuario usando la API
    
    Args:
        name: Nombre del usuario
        last_name: Apellido del usuario
        username: Nombre de usuario
        password: Contraseña
        is_admin: Si es administrador (default: False)
    
    Returns:
        Dict con la respuesta de la API
    """
    url = f"{API_URL}/users/create"
    
    data = {
        "name": name,
        "last_name": last_name,
        "username": username,
        "password": password,
        "is_admin": is_admin
    }
    
    try:
        # Preparar la petición
        json_data = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=json_data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        # Realizar la petición
        with urllib.request.urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            return {
                "success": True,
                "data": response_data,
                "message": f"Usuario {username} creado exitosamente"
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            error_msg = error_data.get('detail', str(e))
        except:
            error_msg = str(e)
        return {
            "success": False,
            "error": error_msg,
            "message": f"Error al crear usuario {username}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Error al crear usuario {username}"
        }

def generate_username(name: str, last_name: str, index: int) -> str:
    """
    Genera un nombre de usuario único basado en nombre y apellido
    """
    # Tomar primera letra del nombre y apellido completo
    username = f"{name[0].lower()}{last_name.lower()}"
    # Si hay duplicados, agregar número
    if index > 0:
        username = f"{username}{index}"
    return username

def main():
    """
    Función principal que crea 20 usuarios
    """
    print("=" * 50)
    print("Creando 20 usuarios de prueba...")
    print("=" * 50)
    
    created = 0
    failed = 0
    
    # Crear 15 operarios y 5 administradores
    for i in range(20):
        name = nombres[i]
        last_name = apellidos[i]
        username = generate_username(name, last_name, i)
        password = "password123"  # Contraseña por defecto
        is_admin = i < 5  # Los primeros 5 serán administradores
        
        print(f"\n[{i+1}/20] Creando usuario: {name} {last_name} ({username})...")
        
        result = create_user(name, last_name, username, password, is_admin)
        
        if result["success"]:
            created += 1
            rol = "Administrador" if is_admin else "Operario"
            print(f"  [OK] {rol} creado exitosamente")
        else:
            failed += 1
            print(f"  [ERROR] {result.get('error', 'Desconocido')}")
    
    print("\n" + "=" * 50)
    print(f"Resumen:")
    print(f"  [OK] Usuarios creados: {created}")
    print(f"  [ERROR] Errores: {failed}")
    print("=" * 50)

if __name__ == "__main__":
    main()
