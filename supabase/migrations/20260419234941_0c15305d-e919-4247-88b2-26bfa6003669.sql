DO $$
DECLARE
  v_conname text;
BEGIN
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'platform_connections'
      AND c.contype = 'u'
  LOOP
    IF EXISTS (
      SELECT 1
      FROM (
        SELECT array_agg(a.attname ORDER BY a.attname) AS cols
        FROM pg_constraint c2
        JOIN pg_attribute a ON a.attrelid = c2.conrelid AND a.attnum = ANY(c2.conkey)
        WHERE c2.conname = v_conname
      ) sub
      WHERE sub.cols @> ARRAY['client_id','platform']::name[]
        AND array_length(sub.cols, 1) <= 2
    ) THEN
      EXECUTE format('ALTER TABLE public.platform_connections DROP CONSTRAINT %I', v_conname);
    END IF;
  END LOOP;
END $$;