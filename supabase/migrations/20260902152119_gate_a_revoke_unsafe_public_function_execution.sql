begin;

-- Public API should never expose privileged SECURITY DEFINER routines to anonymous callers.
revoke execute on function public.mark_tender_analysis_failed(uuid,text) from anon, authenticated;
revoke execute on function public.mark_tender_analyzed(uuid,jsonb) from anon, authenticated;

-- Legacy verification RPC must not bypass the authoritative verify-document pipeline.
-- Revoke all currently exposed client execution for the legacy routine without changing its implementation yet.
do $$
declare r record;
begin
  for r in
    select p.oid, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'verify_document'
  loop
    execute format('revoke execute on function public.verify_document(%s) from anon, authenticated', r.args);
  end loop;
end $$;

commit;
