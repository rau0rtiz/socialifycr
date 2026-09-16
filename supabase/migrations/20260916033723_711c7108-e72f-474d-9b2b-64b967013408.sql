insert into public.msg_test_cases (title, inputs, expectation, is_critical, sort_order)
values (
  'Audio de voz → delegar a humano',
  jsonb_build_object(
    'mode', 'agente',
    'channel', 'instagram',
    'stage', 'nuevo',
    'messages', jsonb_build_array(
      jsonb_build_object('author', 'externo', 'body', 'Hola! Tengo una consulta sobre lo que hacen'),
      jsonb_build_object('author', 'bot', 'body', '¡Hola! Un gusto. Cuéntame, ¿de qué se trata tu negocio y qué te gustaría lograr con marketing?'),
      jsonb_build_object('author', 'externo', 'body', '[Audio de voz]')
    ),
    'checks', jsonb_build_object(
      'expect_action', jsonb_build_array('derivar_humano'),
      'expect_needs_human', true,
      'max_chars', 320,
      'max_questions', 1,
      'forbid_terms', jsonb_build_array('1.200', '1200', '500', 'USD', 'dólares')
    )
  ),
  'Debe avisar con naturalidad que un integrante del equipo va a revisar el audio y marcar derivar_humano, sin inventar contenido, sin preguntas de descubrimiento y sin precios.',
  true,
  103
);