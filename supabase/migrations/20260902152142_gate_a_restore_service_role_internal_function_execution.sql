begin;

grant execute on function public.mark_tender_analysis_failed(uuid,text) to service_role;
grant execute on function public.mark_tender_analyzed(uuid,jsonb) to service_role;
grant execute on function public.mark_tender_analyzed(uuid,text,timestamptz,jsonb,jsonb) to service_role;
grant execute on function public.verify_document(uuid) to service_role;

commit;
