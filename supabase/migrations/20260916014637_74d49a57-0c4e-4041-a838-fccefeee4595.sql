REVOKE EXECUTE ON FUNCTION public.msg_offers_fingerprint() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.msg_publish_knowledge(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_offers_fingerprint() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.msg_publish_knowledge(integer) TO authenticated, service_role;