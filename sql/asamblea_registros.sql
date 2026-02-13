CREATE TABLE public.asamblea_registros (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	asamblea_id uuid NOT NULL,
	cedula varchar(20) NOT NULL,
	nombre varchar(100) NOT NULL,
	telefono varchar(20) NULL,
	numero_torre varchar(10) NULL,
	numero_apartamento varchar(10) NULL,
	numero_control varchar(20) NULL,
	coeficiente numeric(10, 4) NULL,
	actividad_ingreso jsonb NULL,
	gestion_poderes jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT asamblea_registros_pkey PRIMARY KEY (id)
);

ALTER TABLE public.asamblea_registros ADD CONSTRAINT asamblea_registros_asamblea_fk FOREIGN KEY (asamblea_id) REFERENCES public.asambleas(id) ON DELETE CASCADE;