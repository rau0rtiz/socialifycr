CREATE TABLE public.channel_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.msg_channel NOT NULL,
  external_account_id text,
  access_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'short_lived',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_account_id)
);

GRANT ALL ON public.channel_secrets TO service_role;

ALTER TABLE public.channel_secrets ENABLE ROW LEVEL SECURITY;
-- Sin políticas: la tabla queda bloqueada para clientes; solo service_role (funciones backend) la accede.