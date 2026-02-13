# Guía de Docker para Registros-Votación

Esta guía explica cómo construir y ejecutar los contenedores Docker para el frontend y backend en Amazon Linux 2023.

## Requisitos Previos

- Docker instalado en Amazon Linux 2023
- Docker Compose (opcional, para desarrollo local)

### Instalación de Docker en Amazon Linux 2023

```bash
# Actualizar el sistema
sudo dnf update -y

# Instalar Docker
sudo dnf install docker -y

# Iniciar el servicio Docker
sudo systemctl start docker
sudo systemctl enable docker

# Agregar el usuario al grupo docker (para ejecutar sin sudo)
sudo usermod -aG docker $USER
# Nota: Necesitarás cerrar sesión y volver a iniciar sesión para que el cambio tenga efecto
```

## Estructura de Archivos

```
.
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ...
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ...
└── docker-compose.yml
```

## Construcción de Imágenes

### Backend

```bash
cd backend
docker build -t registros-votacion-backend:latest .
```

### Frontend

```bash
cd frontend
docker build -t registros-votacion-frontend:latest .
```

## Ejecución de Contenedores

### Backend

El backend requiere las siguientes variables de entorno:

```bash
docker run -d \
  --name registros-votacion-backend \
  -p 8000:8000 \
  -e RDSHOST=tu-host-rds \
  -e DB_NAME=tu-base-de-datos \
  -e PORT=5432 \
  -e USER=tu-usuario-db \
  -e PASSWORD=tu-password-db \
  -e SECRET_KEY=tu-secret-key-segura \
  -e ALGORITHM=HS256 \
  -e ACCESS_TOKEN_EXPIRE_MINUTES=30 \
  -e CORS_ORIGINS=http://tu-dominio-frontend:3000,https://tu-dominio-frontend \
  registros-votacion-backend:latest
```

### Frontend

El frontend requiere la URL del backend:

```bash
docker run -d \
  --name registros-votacion-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://tu-backend:8000 \
  registros-votacion-frontend:latest
```

## Usando Docker Compose (Desarrollo Local)

Para desarrollo local, puedes usar el archivo `docker-compose.yml`:

```bash
# Construir y ejecutar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

**Nota:** Ajusta las variables de entorno en `docker-compose.yml` según tu configuración.

## Variables de Entorno

### Backend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `RDSHOST` | Host de la base de datos PostgreSQL | `mi-rds.region.rds.amazonaws.com` |
| `DB_NAME` | Nombre de la base de datos | `registros_votacion` |
| `PORT` | Puerto de la base de datos | `5432` |
| `USER` | Usuario de la base de datos | `postgres` |
| `PASSWORD` | Contraseña de la base de datos | `tu-password` |
| `SECRET_KEY` | Clave secreta para JWT | `clave-super-secreta` |
| `ALGORITHM` | Algoritmo para JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tiempo de expiración del token | `30` |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma) | `http://localhost:3000,https://mi-dominio.com` |

### Frontend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend API | `http://backend:8000` o `https://api.mi-dominio.com` |

## Despliegue en Producción (Amazon Linux 2023)

### 1. Construir las imágenes

```bash
# En el servidor o en tu máquina local
cd backend
docker build -t registros-votacion-backend:latest .

cd ../frontend
docker build -t registros-votacion-frontend:latest .
```

### 2. Subir las imágenes a un registro (opcional)

Si usas Amazon ECR:

```bash
# Autenticarse en ECR
aws ecr get-login-password --region tu-region | docker login --username AWS --password-stdin tu-account-id.dkr.ecr.tu-region.amazonaws.com

# Etiquetar las imágenes
docker tag registros-votacion-backend:latest tu-account-id.dkr.ecr.tu-region.amazonaws.com/registros-votacion-backend:latest
docker tag registros-votacion-frontend:latest tu-account-id.dkr.ecr.tu-region.amazonaws.com/registros-votacion-frontend:latest

# Subir las imágenes
docker push tu-account-id.dkr.ecr.tu-region.amazonaws.com/registros-votacion-backend:latest
docker push tu-account-id.dkr.ecr.tu-region.amazonaws.com/registros-votacion-frontend:latest
```

### 3. Ejecutar en el servidor

```bash
# Backend
docker run -d \
  --name registros-votacion-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  -e RDSHOST=tu-rds-host \
  -e DB_NAME=tu-db-name \
  -e PORT=5432 \
  -e USER=tu-db-user \
  -e PASSWORD=tu-db-password \
  -e SECRET_KEY=tu-secret-key \
  -e ALGORITHM=HS256 \
  -e ACCESS_TOKEN_EXPIRE_MINUTES=30 \
  -e CORS_ORIGINS=https://tu-dominio.com \
  registros-votacion-backend:latest

# Frontend
docker run -d \
  --name registros-votacion-frontend \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.tu-dominio.com \
  registros-votacion-frontend:latest
```

## Uso con Nginx como Reverse Proxy (Recomendado)

Para producción, se recomienda usar Nginx como reverse proxy:

```nginx
# /etc/nginx/conf.d/registros-votacion.conf

# Backend API
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Verificación

### Verificar que los contenedores están corriendo

```bash
docker ps
```

### Ver logs

```bash
# Backend
docker logs registros-votacion-backend

# Frontend
docker logs registros-votacion-frontend

# Seguir logs en tiempo real
docker logs -f registros-votacion-backend
```

### Probar el backend

```bash
curl http://localhost:8000/docs
```

### Probar el frontend

Abre en el navegador: `http://localhost:3000`

## Solución de Problemas

### El contenedor se detiene inmediatamente

```bash
# Ver logs para identificar el error
docker logs registros-votacion-backend
docker logs registros-votacion-frontend
```

### Problemas de conexión a la base de datos

- Verifica que las variables de entorno estén correctas
- Verifica que el RDS tenga el Security Group configurado para permitir conexiones desde el servidor
- Verifica que el usuario y contraseña sean correctos

### Problemas de CORS

- Asegúrate de que `CORS_ORIGINS` incluya la URL exacta del frontend
- Verifica que no haya espacios en la lista de orígenes

### El frontend no puede conectarse al backend

- Verifica que `NEXT_PUBLIC_API_URL` esté configurado correctamente
- Si están en contenedores separados, usa el nombre del servicio o la IP del contenedor
- Verifica que el puerto del backend esté expuesto y accesible

## Notas Importantes

1. **Seguridad**: Nunca expongas las credenciales de la base de datos o el SECRET_KEY en el código. Usa variables de entorno o un gestor de secretos como AWS Secrets Manager.

2. **CORS**: En producción, configura `CORS_ORIGINS` con las URLs exactas de tu frontend (sin trailing slash).

3. **Puertos**: Asegúrate de que los puertos 8000 (backend) y 3000 (frontend) no estén siendo usados por otros servicios.

4. **Firewall**: Configura el Security Group de EC2 para permitir tráfico en los puertos necesarios (80, 443, 3000, 8000 según tu configuración).
