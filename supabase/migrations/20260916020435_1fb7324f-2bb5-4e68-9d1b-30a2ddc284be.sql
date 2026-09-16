ALTER TABLE public.msg_knowledge_versions ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.msg_save_knowledge_draft(p_manual text, p_tone_notes text, p_rules jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  IF NOT public.is_admin_or_higher(auth.uid()) THEN
    RAISE EXCEPTION 'Solo un administrador puede editar el manual';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next FROM public.msg_knowledge_versions;

  INSERT INTO public.msg_knowledge_versions (version, manual, tone_notes, rules, is_published, author_id)
  VALUES (v_next, p_manual, NULLIF(p_tone_notes, ''), COALESCE(p_rules, '[]'::jsonb), false, auth.uid());

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.msg_save_knowledge_draft(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.msg_save_knowledge_draft(text, text, jsonb) TO authenticated;

UPDATE public.msg_knowledge_versions
SET rules = '[
  "Primero entender el negocio: a qué se dedica, qué vende y qué está haciendo hoy en marketing.",
  "El precio solo se menciona si la persona pregunta textualmente por precio, costo, tarifas, paquetes o presupuesto.",
  "Si pide información general o pregunta por los paquetes sin pedir precio, explicá el enfoque en una o dos oraciones y hacé una sola pregunta de descubrimiento, sin montos.",
  "Producción audiovisual es un flujo separado: no se mezcla con marketing mensual.",
  "Nunca negociar, prometer descuentos ni inventar entregables, plazos o resultados."
]'::jsonb
WHERE rules = '[]'::jsonb;

INSERT INTO public.msg_test_cases (title, expectation, is_critical, sort_order, inputs)
VALUES
(
  'Pregunta por los paquetes sin pedir precio',
  'Debe explicar el enfoque y hacer una pregunta de descubrimiento, sin mencionar ningún monto.',
  true,
  100,
  '{"mode":"agente","channel":"instagram","stage":"nuevo","messages":[{"author":"externo","body":"Hola, me interesa saber sobre los paquetes que manejan"}],"checks":{"max_chars":400,"max_questions":1,"forbid_terms":["1.200","1200","500","USD","dólares"],"expect_action":["responder","pedir_dato"]}}'::jsonb
),
(
  'Pregunta directa por el precio',
  'Debe dar el precio de marketing desde USD 1.200 + IVA y aclarar que la pauta va aparte desde USD 500 por plataforma.',
  true,
  101,
  '{"mode":"agente","channel":"instagram","stage":"conversando","messages":[{"author":"externo","body":"Tengo una clínica dental con dos asistentes, hoy hacemos posts nosotros"},{"author":"bot","body":"Gracias por el contexto. ¿Qué resultado te gustaría ver en los próximos tres meses?"},{"author":"externo","body":"Más pacientes nuevos. ¿Cuánto cuesta el servicio?"}],"checks":{"max_chars":460,"max_questions":1,"require_terms":[["1.200","1200"],["iva"],["pauta"]],"expect_intent":"marketing"}}'::jsonb
),
(
  'Pide información vaga',
  'Debe hacer descubrimiento sin dar montos ni asumir el rubro del negocio.',
  true,
  102,
  '{"mode":"agente","channel":"instagram","stage":"nuevo","messages":[{"author":"externo","body":"Hola, info por favor"}],"checks":{"max_chars":320,"max_questions":1,"forbid_terms":["1.200","1200","500","USD"],"expect_action":["responder","pedir_dato"]}}'::jsonb
);