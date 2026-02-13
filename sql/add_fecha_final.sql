-- Script simple para agregar la columna fecha_final a la tabla asambleas
-- Ejecuta este script en tu base de datos PostgreSQL

ALTER TABLE public.asambleas 
ADD COLUMN IF NOT EXISTS fecha_final timestamptz NULL;
