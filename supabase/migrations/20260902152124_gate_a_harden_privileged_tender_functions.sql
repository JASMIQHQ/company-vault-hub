begin;

-- These functions are internal mutation helpers. Keep them callable only by the
-- trusted backend role until explicit caller authorization is added and tested.
revoke execute on function public.mark_tender_analysis_failed(uuid,text) from public, anon, authenticated;
revoke execute on function public.mark_tender_analyzed(uuid,jsonb) from public, anon, authenticated;

-- Harden SECURITY DEFINER resolution against search_path object shadowing.
alter function public.mark_tender_analysis_failed(uuid,text) set search_path = public, pg_temp;
alter function public.mark_tender_analyzed(uuid,jsonb) set search_path = public, pg_temp;

commit;
