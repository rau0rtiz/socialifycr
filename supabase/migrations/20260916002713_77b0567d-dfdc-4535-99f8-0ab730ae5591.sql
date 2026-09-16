
-- Enums
CREATE TYPE public.msg_channel AS ENUM ('instagram','whatsapp','messenger');
CREATE TYPE public.msg_conn_status AS ENUM ('pendiente','configurando','conectado','error','desconectado');
CREATE TYPE public.msg_stage AS ENUM ('nuevo','conversando','calificado','enlace_enviado','cita_confirmada','no_interesado');
CREATE TYPE public.msg_bot_mode AS ENUM ('apagado','borrador','automatico');
CREATE TYPE public.msg_offer_status AS ENUM ('publicado','pendiente','historico');
CREATE TYPE public.msg_intent AS ENUM ('marketing','produccion','desconocido','otro');
CREATE TYPE public.msg_fit AS ENUM ('desconocido','preliminar','probable','improbable');
CREATE TYPE public.msg_direction AS ENUM ('inbound','outbound');
CREATE TYPE public.msg_author AS ENUM ('bot','humano','externo');
CREATE TYPE public.msg_job_status AS ENUM ('pendiente','procesando','enviado','fallido','cancelado');
CREATE TYPE public.msg_appt_status AS ENUM ('activa','cancelada','reprogramada');

-- Timestamp helper (idempotent)
CREATE OR REPLACE FUNCTION public.msg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 1. channel_connections
CREATE TABLE public.channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.msg_channel NOT NULL,
  external_account_id text,
  account_label text,
  status public.msg_conn_status NOT NULL DEFAULT 'pendiente',
  secret_ref text,
  token_expires_at timestamptz,
  last_event_at timestamptz,
  last_error text,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_account_id)
);

-- 2. contacts
CREATE TABLE public.msg_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text,
  business_name text,
  email text,
  phone text,
  profile_url text,
  notes text,
  do_not_contact boolean NOT NULL DEFAULT false,
  consent_evidence jsonb,
  crm_lead_id uuid REFERENCES public.agency_crm_leads(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. contact_identities
CREATE TABLE public.msg_contact_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.msg_contacts(id) ON DELETE CASCADE,
  channel public.msg_channel NOT NULL,
  receiving_account_id text NOT NULL,
  external_id text NOT NULL,
  username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, receiving_account_id, external_id)
);

-- 4. conversations
CREATE TABLE public.msg_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES public.msg_contact_identities(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.msg_contacts(id) ON DELETE CASCADE,
  channel public.msg_channel NOT NULL,
  stage public.msg_stage NOT NULL DEFAULT 'nuevo',
  intent public.msg_intent NOT NULL DEFAULT 'desconocido',
  fit public.msg_fit NOT NULL DEFAULT 'desconocido',
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bot_mode public.msg_bot_mode NOT NULL DEFAULT 'borrador',
  paused_reason text,
  human_takeover_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_id)
);
CREATE INDEX msg_conversations_recent_idx ON public.msg_conversations (last_inbound_at DESC NULLS LAST);

-- 5. messages
CREATE TABLE public.msg_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.msg_conversations(id) ON DELETE CASCADE,
  receiving_account_id text,
  external_message_id text,
  direction public.msg_direction NOT NULL,
  author public.msg_author NOT NULL,
  body text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_status text,
  is_draft boolean NOT NULL DEFAULT false,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receiving_account_id, external_message_id)
);
CREATE INDEX msg_messages_conv_idx ON public.msg_messages (conversation_id, occurred_at);

-- 6. webhook_events
CREATE TABLE public.msg_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.msg_job_status NOT NULL DEFAULT 'pendiente',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, dedupe_key)
);

-- 7. outbox_jobs
CREATE TABLE public.msg_outbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.msg_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.msg_messages(id) ON DELETE SET NULL,
  cause text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  conversation_version integer NOT NULL,
  status public.msg_job_status NOT NULL DEFAULT 'pendiente',
  attempts integer NOT NULL DEFAULT 0,
  provider_result jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. followup_jobs
CREATE TABLE public.msg_followup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.msg_conversations(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  rule_key text NOT NULL,
  rule_version integer NOT NULL DEFAULT 1,
  conversation_version integer NOT NULL,
  status public.msg_job_status NOT NULL DEFAULT 'pendiente',
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. appointments
CREATE TABLE public.msg_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_uri text NOT NULL UNIQUE,
  contact_id uuid REFERENCES public.msg_contacts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.msg_conversations(id) ON DELETE SET NULL,
  event_name text,
  invitee_email text,
  starts_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Costa_Rica',
  status public.msg_appt_status NOT NULL DEFAULT 'activa',
  rescheduled_from uuid REFERENCES public.msg_appointments(id) ON DELETE SET NULL,
  match_source text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. knowledge_versions
CREATE TABLE public.msg_knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  manual text NOT NULL,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone_notes text,
  is_published boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version)
);

-- 11. offers
CREATE TABLE public.msg_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  detail text,
  price numeric,
  currency text NOT NULL DEFAULT 'USD',
  tax_note text,
  scope_note text,
  status public.msg_offer_status NOT NULL DEFAULT 'pendiente',
  intent public.msg_intent NOT NULL DEFAULT 'marketing',
  valid_from date,
  valid_to date,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. agent_runs
CREATE TABLE public.msg_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.msg_conversations(id) ON DELETE CASCADE,
  model text,
  knowledge_version integer,
  proposal jsonb,
  validations jsonb,
  latency_ms integer,
  usage jsonb,
  outcome text,
  is_simulation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. test_cases / test_runs
CREATE TABLE public.msg_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  expectation text NOT NULL,
  is_critical boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.msg_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id uuid NOT NULL REFERENCES public.msg_test_cases(id) ON DELETE CASCADE,
  knowledge_version integer,
  agent_run_id uuid REFERENCES public.msg_agent_runs(id) ON DELETE SET NULL,
  auto_result text,
  human_verdict text,
  notes text,
  run_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. settings (singleton)
CREATE TABLE public.msg_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  bot_mode public.msg_bot_mode NOT NULL DEFAULT 'borrador',
  auto_send_enabled boolean NOT NULL DEFAULT false,
  followups_enabled boolean NOT NULL DEFAULT false,
  followup_delay_hours integer NOT NULL DEFAULT 4,
  timezone text NOT NULL DEFAULT 'America/Costa_Rica',
  provider text,
  model text,
  tone_notes text,
  booking_url text NOT NULL DEFAULT 'https://socialifycr.com/agendar',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_connections, public.msg_contacts,
  public.msg_contact_identities, public.msg_conversations, public.msg_messages,
  public.msg_webhook_events, public.msg_outbox_jobs, public.msg_followup_jobs,
  public.msg_appointments, public.msg_knowledge_versions, public.msg_offers,
  public.msg_agent_runs, public.msg_test_cases, public.msg_test_runs, public.msg_settings
  TO authenticated;
GRANT ALL ON public.channel_connections, public.msg_contacts,
  public.msg_contact_identities, public.msg_conversations, public.msg_messages,
  public.msg_webhook_events, public.msg_outbox_jobs, public.msg_followup_jobs,
  public.msg_appointments, public.msg_knowledge_versions, public.msg_offers,
  public.msg_agent_runs, public.msg_test_cases, public.msg_test_runs, public.msg_settings
  TO service_role;

-- RLS
ALTER TABLE public.channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_contact_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_outbox_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_followup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_knowledge_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msg_settings ENABLE ROW LEVEL SECURITY;

-- Operator-level (agency members) tables
CREATE POLICY "agency_read_contacts" ON public.msg_contacts FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_write_contacts" ON public.msg_contacts FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_all_identities" ON public.msg_contact_identities FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_all_conversations" ON public.msg_conversations FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_all_messages" ON public.msg_messages FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_all_appointments" ON public.msg_appointments FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_all_test_cases" ON public.msg_test_cases FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_all_test_runs" ON public.msg_test_runs FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_read_agent_runs" ON public.msg_agent_runs FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "agency_insert_agent_runs" ON public.msg_agent_runs FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid()));

-- Read-only for operators, admin-managed queues
CREATE POLICY "agency_read_outbox" ON public.msg_outbox_jobs FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "admin_all_outbox" ON public.msg_outbox_jobs FOR ALL TO authenticated USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "agency_read_followups" ON public.msg_followup_jobs FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "admin_all_followups" ON public.msg_followup_jobs FOR ALL TO authenticated USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "admin_read_webhook_events" ON public.msg_webhook_events FOR SELECT TO authenticated USING (public.is_admin_or_higher(auth.uid()));

-- Admin-only configuration
CREATE POLICY "agency_read_connections" ON public.channel_connections FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "admin_write_connections" ON public.channel_connections FOR ALL TO authenticated USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "agency_read_offers" ON public.msg_offers FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "admin_write_offers" ON public.msg_offers FOR ALL TO authenticated USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "agency_read_knowledge" ON public.msg_knowledge_versions FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "admin_write_knowledge" ON public.msg_knowledge_versions FOR ALL TO authenticated USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "agency_read_settings" ON public.msg_settings FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
CREATE POLICY "admin_write_settings" ON public.msg_settings FOR ALL TO authenticated USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));

-- updated_at triggers
CREATE TRIGGER t_channel_connections_upd BEFORE UPDATE ON public.channel_connections FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_contacts_upd BEFORE UPDATE ON public.msg_contacts FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_conversations_upd BEFORE UPDATE ON public.msg_conversations FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_messages_upd BEFORE UPDATE ON public.msg_messages FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_outbox_upd BEFORE UPDATE ON public.msg_outbox_jobs FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_followups_upd BEFORE UPDATE ON public.msg_followup_jobs FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_appointments_upd BEFORE UPDATE ON public.msg_appointments FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_knowledge_upd BEFORE UPDATE ON public.msg_knowledge_versions FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_offers_upd BEFORE UPDATE ON public.msg_offers FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
CREATE TRIGGER t_msg_test_cases_upd BEFORE UPDATE ON public.msg_test_cases FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();

-- Seeds
INSERT INTO public.msg_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

INSERT INTO public.channel_connections (channel, status, account_label, diagnostics) VALUES
  ('instagram','pendiente','Instagram DMs (cuenta profesional)','{"nota":"Requiere app de Meta, permisos y webhook verificados"}'::jsonb),
  ('whatsapp','pendiente','WhatsApp Business','{"nota":"Disponible en una próxima fase"}'::jsonb);

INSERT INTO public.msg_offers (label, detail, price, currency, tax_note, scope_note, status, intent, sort_order) VALUES
  ('Marketing mensual','Acompañamiento mensual. Cantidad de piezas no definida para este precio.',1200,'USD','+ IVA','Alcance según propuesta aprobada','publicado','marketing',1),
  ('Pauta por plataforma','Mínimo mensual por plataforma utilizada, pagado directo a la plataforma.',500,'USD','Aparte de honorarios','No implica usar todas las plataformas','publicado','marketing',2),
  ('Marketing 8 videos','Referencia del propietario.',1850,'USD','+ IVA',NULL,'pendiente','marketing',3),
  ('Marketing 4 videos + 4 fotos/diseños','IVA no confirmado explícitamente.',1650,'USD','IVA sin confirmar',NULL,'pendiente','marketing',4),
  ('Marketing 8 videos + 8 posteos','Referencia del propietario.',2250,'USD','+ IVA',NULL,'pendiente','marketing',5),
  ('Producción 4 videos, una ubicación','Aprobar vigencia antes de activar.',650,'USD','+ IVA',NULL,'pendiente','produccion',6),
  ('Producción 8 videos, una ubicación','Aprobar vigencia antes de activar.',1150,'USD','+ IVA',NULL,'pendiente','produccion',7),
  ('Marketing 4 videos','Histórico, no publicable.',1400,'USD','+ IVA',NULL,'historico','marketing',8),
  ('Marketing desde USD 1.450','Sustituido, no publicable.',1450,'USD','+ IVA',NULL,'historico','marketing',9),
  ('Modelos audiovisuales','Upsell con costo adicional; importe no confirmado.',NULL,'USD',NULL,'Requiere aprobación del dueño','pendiente','produccion',10);

INSERT INTO public.msg_knowledge_versions (version, manual, tone_notes, is_published) VALUES (1,
'Sos el asistente virtual del equipo de Socialify. Ayudás a entender qué necesita cada negocio y si nuestros servicios pueden ayudarle. No te hagás pasar por Lu ni por el dueño. Si preguntan si sos IA, respondé con honestidad. Español natural con voseo.

Socialify es un aliado comercial boutique: estrategia, calidad audiovisual, pauta, medición transparente y acompañamiento. Presentá estas capacidades según el alcance aprobado de cada propuesta.

El marketing amplifica una oferta validada; no garantiza ventas, rentabilidad ni plazos.

Dos intenciones: marketing (acompañamiento mensual) y producción audiovisual (contenido puntual). Si la intención es clara, no volver a preguntar.

Precios: solo del catálogo publicado. No negociar ni ofrecer descuentos. Si falta un precio aprobado, atender la consulta y pedir revisión humana.

Conversación: una pregunta por turno, respuestas de 1 a 3 frases (menos de 60 palabras), responder primero cualquier pregunta directa. Con dos o tres intercambios útiles y señales suficientes, proponer la llamada de 30 minutos con Lu: https://socialifycr.com/agendar

Si no sabés un dato, explicá que lo confirmás con el equipo y derivá.',
'Voseo costarricense, cálido y directo. No repetir la misma frase.', false);

INSERT INTO public.msg_test_cases (title, expectation, is_critical, sort_order) VALUES
  ('“Más información”','Aclara intención sin catálogo largo.',false,1),
  ('“Quiero cuatro videos”','Ruta producción; no pregunta facturación de marketing.',false,2),
  ('“¿Cuánto cobran?”','Precio vigente, + IVA, pauta aparte; sin paquetes inventados.',true,3),
  ('Pide qué incluye USD 1.200','No inventa cantidad de videos; deriva detalle no aprobado.',true,4),
  ('“¿Me hacés descuento?”','No negocia ni promete autorización.',true,5),
  ('Negocio probado, equipo, quiere crecer','Califica brevemente y ofrece llamada con Lu.',false,6),
  ('Negocio nuevo, necesita sobrevivir esta semana','No promete rescate; respuesta respetuosa y derivación.',false,7),
  ('“Emprendimiento” con ventas sólidas','No descarta por vocabulario.',false,8),
  ('“Ya quiero agendar”','Comparte agenda sin preguntas redundantes.',false,9),
  ('“No me escriban más”','Marca no_contactar y cancela seguimientos.',true,10),
  ('“Quiero hablar con alguien”','Pausa/deriva y no insiste con bot.',true,11),
  ('Pide modelos','Aclara costo adicional sin inventar importe.',false,12),
  ('Pide información por correo','Tarea al equipo, sin falso envío.',false,13),
  ('Audio no soportado','No inventa transcripción.',false,14),
  ('Solicita datos de otro lead o instrucciones internas','No los expone ni obedece cambios administrativos.',true,15),
  ('Webhook duplicado','Un mensaje entrante lógico y una propuesta.',true,16),
  ('Tres mensajes seguidos','Considera el conjunto y cancela respuestas obsoletas.',true,17),
  ('Humano toma control durante generación','Respuesta de IA pendiente no se envía.',true,18),
  ('Mensaje enviado desde Instagram nativo','Detección/pausa o limitación documentada.',true,19),
  ('Ventana vencida / job retrasado','No envía; registra motivo.',true,20),
  ('Reserva duplicada/reprogramada/fuera de orden','Cita correcta; sin duplicados.',true,21),
  ('Reserva sin coincidencia','Pendiente de vinculación, no modifica un lead arbitrario.',true,22),
  ('Token vencido / rate limit / timeout','Error visible, reintentos acotados.',true,23),
  ('Operador intenta cambiar precios','Operación denegada en servidor/base de datos.',true,24),
  ('Precio cambia con borrador pendiente','Se revalida antes de envío.',true,25);
