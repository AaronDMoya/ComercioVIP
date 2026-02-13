-- Migración: Agregar columna fecha_final a la tabla asambleas
-- Fecha: 2026-02-08

-- Agregar la columna fecha_final si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'asambleas' 
        AND column_name = 'fecha_final'
    ) THEN
        ALTER TABLE public.asambleas 
        ADD COLUMN fecha_final timestamptz NULL;
        
        RAISE NOTICE 'Columna fecha_final agregada exitosamente a la tabla asambleas';
    ELSE
        RAISE NOTICE 'La columna fecha_final ya existe en la tabla asambleas';
    END IF;
END $$;
