# Estructura del Proyecto - Backend Registros-Votacion

## 📋 Descripción General

Backend desarrollado con **FastAPI** para el sistema de Registros de Votación. Utiliza **PostgreSQL** como base de datos y sigue una arquitectura modular y escalable en capas (API → Service → Repository → Model).

## 📁 Estructura de Directorios

```
backend/
├── app/                          # Módulo principal de la aplicación
│   ├── api/                      # Capa de API y endpoints
│   │   └── v1/                   # Versión 1 de la API
│   │       ├── router.py         # Router principal que agrupa todas las rutas
│   │       └── routes/           # Endpoints específicos
│   │           ├── health.py     # Endpoints de salud y verificación
│   │           └── users.py     # Endpoints de gestión de usuarios
│   │
│   ├── core/                     # Configuración y componentes centrales
│   │   ├── config.py            # Variables de configuración y entorno
│   │   ├── database.py          # Configuración de SQLAlchemy y conexión DB
│   │   ├── logging.py           # Configuración de logging (vacío)
│   │   └── security.py          # Funciones de seguridad (hash de contraseñas)
│   │
│   ├── models/                   # Modelos de SQLAlchemy (ORM)
│   │   └── user_model.py        # Modelo de usuario
│   │
│   ├── repositories/             # Capa de acceso a datos
│   │   └── user_repository.py   # Repositorio de usuarios
│   │
│   ├── schemas/                  # Esquemas Pydantic para validación
│   │   └── user_schema.py        # Esquemas de usuario (UserCreate, UserResponse)
│   │
│   ├── services/                 # Lógica de negocio
│   │   └── user_service.py      # Servicios de usuario
│   │
│   └── utils/                    # Utilidades y funciones auxiliares
│
├── docs/                         # Documentación del proyecto
│   └── ESTRUCTURA.md             # Este documento
│
├── test/                         # Pruebas del proyecto
│   └── test_database_connection.py  # Script de prueba de conexión DB
│
├── ev/                           # Entorno virtual de Python
├── main.py                       # Punto de entrada de la aplicación
└── requirements.txt              # Dependencias del proyecto
```

## 📄 Descripción de Archivos Principales

### `main.py`
Punto de entrada de la aplicación FastAPI. Crea la instancia de la aplicación, inicializa las tablas de la base de datos e incluye el router principal.

**Contenido:**
- Instancia de FastAPI
- Creación automática de tablas con `Base.metadata.create_all(bind=engine)`
- Inclusión del router de la API v1

### `requirements.txt`
Dependencias del proyecto:
- `fastapi` - Framework web
- `uvicorn` - Servidor ASGI
- `sqlalchemy` - ORM para base de datos
- `python-dotenv` - Manejo de variables de entorno
- `psycopg2-binary` - Driver de PostgreSQL
- `passlib[argon2]` - Utilidades de seguridad para contraseñas (hashing)
- `python-jose[cryptography]` - Utilidades JWT (para futura autenticación)

### `app/core/config.py`
Maneja las variables de entorno y configuración del proyecto.

**Variables configuradas:**
- `RDSHOST` - Host de la base de datos RDS
- `DB_NAME` - Nombre de la base de datos
- `PORT` - Puerto de la base de datos
- `USER` - Usuario de la base de datos
- `PASSWORD` - Contraseña de la base de datos

### `app/core/database.py`
Configuración de SQLAlchemy y gestión de conexiones a la base de datos.

**Componentes principales:**
- `DATABASE_URL` - URL de conexión construida desde las variables de entorno
- `engine` - Motor de SQLAlchemy con pool de conexiones
- `Base` - Clase base para modelos ORM
- `SessionLocal` - Factory para crear sesiones de base de datos
- `get_db()` - Generador de dependencia para FastAPI (inyección de dependencias)
- `test_connection()` - Función para probar la conexión

**Configuración del pool:**
- `pool_pre_ping=True` - Verifica conexiones antes de usarlas
- `pool_size=10` - Tamaño del pool de conexiones
- `max_overflow=20` - Conexiones adicionales permitidas

### `app/core/security.py`
Funciones de seguridad para el manejo de contraseñas.

**Funciones:**
- `hash_password(password: str)` - Genera hash de contraseña usando Argon2
- `pwd_context` - Contexto de cifrado con esquema Argon2

### `app/models/user_model.py`
Modelo SQLAlchemy para la tabla de usuarios.

**Campos:**
- `id` - UUID (clave primaria, generado automáticamente)
- `name` - String(100), nombre del usuario
- `last_name` - String(100), apellido del usuario
- `username` - String(50), único, nombre de usuario
- `password` - String, contraseña hasheada
- `is_admin` - Boolean, indica si el usuario es administrador (default: False)
- `created_at` - TIMESTAMP, fecha de creación (generado automáticamente)
- `updated_at` - TIMESTAMP, fecha de actualización (generado automáticamente)

**Tabla:** `users`

### `app/schemas/user_schema.py`
Esquemas Pydantic para validación y serialización de datos de usuario.

**Esquemas:**
- `UserCreate` - Esquema para crear un usuario
  - Campos: `name`, `last_name`, `username`, `password`
- `UserResponse` - Esquema para respuesta de usuario
  - Campos: `id` (UUID), `name`, `last_name`, `username`, `is_admin`
  - Configurado con `from_attributes = True` para compatibilidad con SQLAlchemy

### `app/repositories/user_repository.py`
Capa de acceso a datos para usuarios. Contiene las operaciones CRUD básicas.

**Funciones:**
- `get_by_username(db: Session, username: str)` - Obtiene un usuario por username
- `create_user(db: Session, user: User)` - Crea un nuevo usuario en la base de datos

### `app/services/user_service.py`
Lógica de negocio para usuarios. Contiene la validación y procesamiento de datos.

**Funciones:**
- `create_new_user(db: Session, data_user: UserCreate)` - Crea un nuevo usuario
  - Valida que el username no exista
  - Hashea la contraseña antes de guardarla
  - Crea el usuario en la base de datos

### `app/api/v1/router.py`
Router principal que agrupa todos los routers de la versión 1 de la API.

**Routers incluidos:**
- `health.router` - Endpoints de salud
- `users.router` - Endpoints de usuarios

### `app/api/v1/routes/health.py`
Endpoints para verificar el estado de la API y la conexión a la base de datos.

**Endpoints:**
- `GET /health/` - Verifica que el backend está corriendo
  - Respuesta: `{"status": "backend is running"}`
  
- `GET /health/db` - Verifica la conexión a la base de datos
  - Prueba la conexión usando `test_connection()`
  - Prueba la sesión de base de datos
  - Respuesta: `{"status": "Connection to the database is successfull"}`
  - Error 503 si falla la conexión

### `app/api/v1/routes/users.py`
Endpoints para la gestión de usuarios.

**Endpoints:**
- `POST /users/create/` - Crea un nuevo usuario
  - Body: `UserCreate` (name, last_name, username, password)
  - Response: `UserResponse` (id, name, last_name, username, is_admin)
  - Valida que el username no exista
  - Hashea la contraseña automáticamente

### `test/test_database_connection.py`
Script de prueba para verificar la conexión a la base de datos.

**Pruebas realizadas:**
1. Conexión básica a la base de datos
2. Creación y cierre de sesiones
3. Obtención de información de la base de datos (versión, nombre)

**Ejecución:**
```bash
python -m test.test_database_connection
```

## 🏗️ Arquitectura del Proyecto

El proyecto sigue una arquitectura en capas (Clean Architecture):

```
┌─────────────────────────────────────┐
│         API Layer (routes)          │  ← Endpoints HTTP / FastAPI
├─────────────────────────────────────┤
│      Service Layer (services)       │  ← Lógica de negocio / Validaciones
├─────────────────────────────────────┤
│   Repository Layer (repositories)   │  ← Acceso a datos / CRUD
├─────────────────────────────────────┤
│      Model Layer (models)          │  ← Modelos ORM / SQLAlchemy
├─────────────────────────────────────┤
│      Database (PostgreSQL)         │  ← Base de datos
└─────────────────────────────────────┘
```

### Flujo de Datos

1. **Request** → `routes/users.py` recibe la petición HTTP
2. **Validation** → `schemas/user_schema.py` valida los datos con Pydantic
3. **Business Logic** → `services/user_service.py` aplica reglas de negocio
4. **Data Access** → `repositories/user_repository.py` accede a la base de datos
5. **ORM** → `models/user_model.py` mapea a la tabla de PostgreSQL
6. **Response** → Retorna datos serializados con `UserResponse`

### Capas Actuales Implementadas

✅ **API Layer** - Endpoints de health y usuarios implementados
✅ **Service Layer** - Servicios de usuario implementados
✅ **Repository Layer** - Repositorio de usuarios implementado
✅ **Model Layer** - Modelo de usuario implementado
✅ **Core Layer** - Configuración, base de datos y seguridad implementados
⏳ **Utils Layer** - Preparado para funciones auxiliares
⏳ **Logging** - Preparado para configuración de logging

## 🔌 Endpoints Disponibles

### Health Check
- **GET** `/health/` - Estado del backend
- **GET** `/health/db` - Estado de la conexión a la base de datos

### Usuarios
- **POST** `/users/create/` - Crear un nuevo usuario
  - Body requerido:
    ```json
    {
      "name": "string",
      "last_name": "string",
      "username": "string",
      "password": "string"
    }
    ```
  - Respuesta exitosa (200):
    ```json
    {
      "id": "uuid",
      "name": "string",
      "last_name": "string",
      "username": "string",
      "is_admin": false
    }
    ```
  - Errores posibles:
    - `400` - Username ya existe
    - `503` - Error de conexión a la base de datos

## 🗄️ Base de Datos

- **Motor:** PostgreSQL
- **ORM:** SQLAlchemy 2.0
- **Conexión:** RDS (Amazon Web Services)
- **Pool de conexiones:** Configurado con 10 conexiones base y 20 adicionales
- **Tablas creadas automáticamente:** `users`

### Estructura de la Tabla `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria, generado automáticamente |
| name | VARCHAR(100) | Nombre del usuario |
| last_name | VARCHAR(100) | Apellido del usuario |
| username | VARCHAR(50) | Nombre de usuario (único) |
| password | VARCHAR | Contraseña hasheada con Argon2 |
| is_admin | BOOLEAN | Es administrador (default: false) |
| created_at | TIMESTAMP | Fecha de creación (auto) |
| updated_at | TIMESTAMP | Fecha de actualización (auto) |

## 🔐 Seguridad

- **Hashing de contraseñas:** Argon2 (a través de passlib)
- **Validación de datos:** Pydantic schemas
- **Preparado para:** JWT authentication (python-jose instalado)

## 🚀 Inicio Rápido

### 1. Configurar variables de entorno
Crear archivo `.env` en la raíz del proyecto:
```env
RDSHOST=tu-host-rds
DB_NAME=nombre-base-datos
PORT=5432
USER=usuario-db
PASSWORD=contraseña-db
```

### 2. Activar entorno virtual
```bash
.\ev\Scripts\Activate.ps1  # Windows PowerShell
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Probar conexión a la base de datos
```bash
python -m test.test_database_connection
```

### 5. Iniciar servidor
```bash
uvicorn main:app --reload
```

### 6. Acceder a la documentación
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### 7. Probar creación de usuario
Usar el endpoint `POST /users/create/` desde la documentación interactiva o con curl:
```bash
curl -X POST "http://localhost:8000/users/create/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan",
    "last_name": "Pérez",
    "username": "juanperez",
    "password": "miPassword123"
  }'
```

## 📝 Notas de Desarrollo

### Carpetas Preparadas para Futuro Desarrollo

- **`app/utils/`** - Aquí se agregarán funciones auxiliares
- **`app/core/logging.py`** - Preparado para configuración de logging
- **`app/models/`** - Listo para agregar más modelos (votaciones, candidatos, etc.)
- **`app/repositories/`** - Listo para agregar más repositorios
- **`app/schemas/`** - Listo para agregar más esquemas
- **`app/services/`** - Listo para agregar más servicios
- **`app/api/v1/routes/`** - Listo para agregar más endpoints

### Próximas Funcionalidades Sugeridas

- ⏳ Autenticación JWT
- ⏳ Endpoints CRUD completos para usuarios (GET, PUT, DELETE)
- ⏳ Modelos y endpoints para votaciones
- ⏳ Modelos y endpoints para candidatos
- ⏳ Sistema de roles y permisos
- ⏳ Logging estructurado
- ⏳ Validaciones adicionales
- ⏳ Manejo de errores centralizado
- ⏳ Tests unitarios y de integración

## 🔧 Tecnologías Utilizadas

- **Python 3.13**
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy 2.0** - ORM para Python
- **PostgreSQL** - Base de datos relacional
- **Uvicorn** - Servidor ASGI de alto rendimiento
- **Pydantic** - Validación de datos (incluido en FastAPI)
- **python-dotenv** - Manejo de variables de entorno
- **passlib[argon2]** - Hashing de contraseñas
- **python-jose[cryptography]** - Utilidades JWT (preparado para autenticación)

## 📊 Estado del Proyecto

### ✅ Completado
- Configuración inicial completada
- Conexión a base de datos implementada y probada
- Endpoints de health check implementados
- Modelo de usuario implementado
- Repositorio de usuario implementado
- Servicio de usuario implementado
- Endpoint de creación de usuarios implementado
- Sistema de hashing de contraseñas (Argon2)
- Validación de datos con Pydantic
- Estructura de carpetas completa

### ⏳ En Desarrollo / Pendiente
- Autenticación y autorización (JWT)
- Endpoints adicionales de usuarios (GET, PUT, DELETE)
- Modelos y endpoints para votaciones
- Modelos y endpoints para candidatos
- Sistema de logging
- Tests automatizados
- Manejo centralizado de errores
- Documentación de API adicional

---

**Última actualización:** Enero 2025
