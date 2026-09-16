ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_link_offers;
ALTER TABLE public.msg_appointments REPLICA IDENTITY FULL;
ALTER TABLE public.msg_link_offers REPLICA IDENTITY FULL;