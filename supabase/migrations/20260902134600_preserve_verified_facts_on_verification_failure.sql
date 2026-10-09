create or replace function public.preserve_verified_facts_on_verification_failure()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'failed'
     and old.verification_status = 'verified'
     and new.verified_doc_type is null then
    new.verified_doc_type := old.verified_doc_type;
    new.verified_year := old.verified_year;
    new.verified_expiry_date := old.verified_expiry_date;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_verified_facts_on_verification_failure on public.company_documents;
create trigger preserve_verified_facts_on_verification_failure
before update on public.company_documents
for each row execute function public.preserve_verified_facts_on_verification_failure();
