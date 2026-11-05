begin;

-- Remove implicit PUBLIC EXECUTE from every SECURITY DEFINER function in public.
-- Then explicitly restore trusted backend access and only the authenticated RPCs
-- that have an organization/user authorization boundary.
do $$
declare r record;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef=true
  loop
    execute format('revoke execute on function public.%I(%s) from public', r.proname, r.args);
    execute format('grant execute on function public.%I(%s) to service_role', r.proname, r.args);
  end loop;
end $$;

-- Authenticated application RPCs whose implementations are scoped to the
-- current organization/profile, or now explicitly validate a supplied org/tender.
grant execute on function public.active_tender_count() to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_role_id() to authenticated;
grant execute on function public.document_exists(text) to authenticated;
grant execute on function public.expiring_document_count(integer) to authenticated;
grant execute on function public.fail_document(uuid) to authenticated;
grant execute on function public.get_document(uuid) to authenticated;
grant execute on function public.get_documents_by_category(text) to authenticated;
grant execute on function public.get_documents_for_review() to authenticated;
grant execute on function public.get_expired_documents() to authenticated;
grant execute on function public.get_expiring_documents(integer) to authenticated;
grant execute on function public.get_pending_analysis() to authenticated;
grant execute on function public.organization_document_count() to authenticated;
grant execute on function public.verified_document_count() to authenticated;
grant execute on function public.supersede_existing_document(text) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.calculate_company_completion(uuid) to authenticated;
grant execute on function public.calculate_tender_compliance(uuid) to authenticated;
grant execute on function public.check_duplicate_document(uuid,text) to authenticated;
grant execute on function public.get_dashboard_summary(uuid) to authenticated;
grant execute on function public.get_organization_dashboard_stats(uuid) to authenticated;
grant execute on function public.get_expiring_documents(uuid,integer) to authenticated;
grant execute on function public.get_upcoming_expiries(uuid) to authenticated;
grant execute on function public.get_tender_summary(uuid) to authenticated;
grant execute on function public.register_document_upload(uuid,text,text,text,text,text,text,bigint,text) to authenticated;

commit;
