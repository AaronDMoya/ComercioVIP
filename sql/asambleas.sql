-- public.asambleas definition

-- Drop table

-- DROP TABLE public.asambleas;

CREATE TABLE public.asambleas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	title varchar(100) NOT NULL,
	description text NULL,
	estado varchar(20) DEFAULT 'CREADA'::character varying NOT NULL,
	fecha_inicio timestamptz NULL,
	created_by varchar(50) NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	fecha_final timestamptz NULL,
	CONSTRAINT asambleas_estado_check CHECK (((estado)::text = ANY ((ARRAY['CREADA'::character varying, 'ACTIVA'::character varying, 'CERRADA'::character varying])::text[]))),
	CONSTRAINT asambleas_pkey PRIMARY KEY (id)
);