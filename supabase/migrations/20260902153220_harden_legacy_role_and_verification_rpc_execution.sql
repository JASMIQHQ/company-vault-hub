revoke execute on function public.current_role_id() from public;
grant execute on function public.current_role_id() to authenticated;
grant execute on function public.current_role_id() to service_role;

revoke execute on function public.is_org_owner(uuid) from public;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to service_role;

revoke execute on function public.verify_document(uuid) from public;
grant execute on function public.verify_document(uuid) to service_role;

revoke execute on function public.refresh_compliance() from public;
grant execute on function public.refresh_compliance() to service_role;

revoke execute on function public.audit_company_document_verification() from public;
grant execute on function public.audit_company_document_verification() to service_role;

revoke execute on function public.preserve_verified_facts_on_verification_failure() from public;
grant execute on function public.preserve_verified_facts_on_verification_failure() to service_role;

revoke execute on function public.prevent_verification_audit_mutation() from public;
grant execute on function public.prevent_verification_audit_mutation() to service_role;
