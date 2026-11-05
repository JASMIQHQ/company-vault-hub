begin;

-- These tables are internal/system data and currently have no client-facing RLS policies.
-- Remove direct Data API table privileges rather than creating permissive catch-all policies.
revoke all on table public.ai_cache from anon, authenticated;
revoke all on table public.ai_settings from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.automation_jobs from anon, authenticated;
revoke all on table public.notification_queue from anon, authenticated;

commit;
