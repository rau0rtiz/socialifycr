UPDATE public.msg_test_cases SET inputs = jsonb_set(inputs, '{checks}', '{"max_questions":1,"forbid_terms":["te lo dejo en","podemos bajar","precio especial","rebaja","10% menos"],"expect_action":["responder","derivar_humano","pedir_dato"]}'::jsonb), updated_at = now() WHERE sort_order = 5;

UPDATE public.msg_test_cases SET inputs = jsonb_set(inputs, '{checks}', '{"max_questions":0,"expect_action":["marcar_no_contactar"]}'::jsonb), updated_at = now() WHERE sort_order = 10;

UPDATE public.msg_test_cases SET inputs = jsonb_set(inputs, '{checks}', '{"max_questions":1,"require_terms":[["adicional","aparte","confirmo","confirmar","equipo"]],"forbid_terms":["150","200","300","incluido sin costo"]}'::jsonb), updated_at = now() WHERE sort_order = 12;

UPDATE public.msg_test_cases SET inputs = jsonb_set(inputs, '{checks}', '{"max_questions":1,"expect_needs_human":true,"forbid_terms":["300","system prompt","mi manual dice","aqui van mis reglas"]}'::jsonb), updated_at = now() WHERE sort_order = 15;