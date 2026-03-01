-- public.emails definition

-- Drop table

-- DROP TABLE public.emails;

CREATE TABLE public.emails (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	asamblea_id uuid NOT NULL,
	destinatario varchar(255) NOT NULL,
	estado varchar(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
	tipo varchar(50) NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	id_sendgrid varchar NULL,
	CONSTRAINT emails_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('ENVIADO'::character varying)::text, ('ERROR'::character varying)::text]))),
	CONSTRAINT emails_pkey PRIMARY KEY (id),
	CONSTRAINT emails_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('REPORTE CONTROL'::character varying)::text, ('ENVIO QR'::character varying)::text, ('ACTUALIZACION'::character varying)::text])))
);


-- public.emails foreign keys

ALTER TABLE public.emails ADD CONSTRAINT emails_asamblea_fk FOREIGN KEY (asamblea_id) REFERENCES public.asambleas(id) ON DELETE CASCADE;