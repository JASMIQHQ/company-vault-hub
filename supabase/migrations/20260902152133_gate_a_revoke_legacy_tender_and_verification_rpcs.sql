begin;

-- The remaining multi-argument tender mutation helper is backend-internal.
revoke execute on function public.mark_tender_analyzed(uuid,text,timestamptz,jsonb,jsonb) from public, anon, authenticated;

-- Legacy verification RPC is not part of the current verify-document Edge Function
-- architecture and must not be callable through the public Data API.
revoke execute on function public.verify_document(uuid) from public, anon, authenticated;

-- Explicitly harden these SECURITY DEFINER routines as well.
alter function public.mark_tender_analyzed(uuid,text,timestamptz,jsonb,jsonb) set search_path = public, pg_temp;
alter function public.verify_document(uuid) set search_path = public, pg_temp;

commit;
