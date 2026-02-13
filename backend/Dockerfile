# Dockerfile para Backend FastAPI
# Optimizado para Amazon Linux 2023

# Usar imagen base oficial de Python 3.11 (compatible con Amazon Linux 2023)
FROM python:3.11-slim

# Establecer variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivo de requisitos primero (para aprovechar cache de Docker)
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar archivo .env si existe (opcional, puede pasarse también con --env-file)
# COPY .env .env

# Copiar el resto del código de la aplicación
COPY . .

# Crear usuario no root para seguridad
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Exponer el puerto 8000 (puerto por defecto de uvicorn)
EXPOSE 8000

# Comando de inicio usando uvicorn
# Se puede sobrescribir con variables de entorno si es necesario
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]