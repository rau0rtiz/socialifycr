alter table public.msg_conversations
  add column if not exists context_summary text,
  add column if not exists context_summary_at timestamptz;