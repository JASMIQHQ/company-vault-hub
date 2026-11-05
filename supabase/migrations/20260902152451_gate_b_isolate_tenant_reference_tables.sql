begin;

-- Tender similarity has no organization_id, so authorization must traverse both tenders.
create policy tender_similarity_member_select on public.tender_similarity
for select to authenticated
using (
  exists (
    select 1 from public.tenders t
    where t.id = tender_similarity.tender_id
      and t.organization_id = public.current_organization_id()
  )
  and exists (
    select 1 from public.tenders t2
    where t2.id = tender_similarity.similar_tender_id
      and t2.organization_id = public.current_organization_id()
  )
);
grant select on public.tender_similarity to authenticated;

-- User-owned preferences: profile ownership is the security boundary.
create policy notification_preferences_owner_select on public.notification_preferences
for select to authenticated
using (profile_id = public.current_profile_id());
grant select on public.notification_preferences to authenticated;

commit;
