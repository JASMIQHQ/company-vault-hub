-- Security hardening: pin public helper functions to the intended schema.
-- These functions are intentionally SECURITY INVOKER; this migration only removes
-- search_path ambiguity and does not broaden privileges.

alter function public.set_updated_at() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.refresh_document_status() set search_path = public;
alter function public.normalize_requirement(text) set search_path = public;
alter function public.calculate_company_score(uuid) set search_path = public;
alter function public.get_corporate_score(uuid) set search_path = public;
