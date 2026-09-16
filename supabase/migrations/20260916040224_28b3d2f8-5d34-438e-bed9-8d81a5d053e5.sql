ALTER TABLE public.msg_messages REPLICA IDENTITY FULL;
ALTER TABLE public.msg_conversations REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.msg_drafts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;