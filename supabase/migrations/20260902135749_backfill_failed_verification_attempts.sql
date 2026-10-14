insert into public.document_verification_attempts (document_id, organization_id, company_id, provider, model, outcome, detected_doc_type, detected_year, detected_expiry_date, confidence, error_stage, error_message, created_at)
select d.id, d.organization_id, d.company_id, 'historical', null, 'failed', d.verified_doc_type, d.verified_year, d.verified_expiry_date, null, 'HISTORICAL_FAILURE', 'Latest verification attempt failed; prior verified facts were preserved.', coalesce(d.updated_at, now())
from public.company_documents d
where d.deleted_at is null and d.verification_status='failed'
  and not exists (select 1 from public.document_verification_attempts a where a.document_id=d.id);
