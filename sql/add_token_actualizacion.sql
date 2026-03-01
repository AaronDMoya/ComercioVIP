-- Token único por registro para acceso a actualización de datos (link en correo / QR).
-- Ejecutar todo el script completo en este orden.

-- Paso 1: Añadir la columna si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'asamblea_registros'
      AND column_name = 'token_actualizacion'
  ) THEN
    ALTER TABLE public.asamblea_registros
    ADD COLUMN token_actualizacion varchar(255) NULL;
  END IF;
END $$;

-- Paso 2: Crear el índice único (solo después de que exista la columna)
CREATE UNIQUE INDEX IF NOT EXISTS idx_asamblea_registros_token_actualizacion
ON public.asamblea_registros (token_actualizacion)
WHERE token_actualizacion IS NOT NULL;
