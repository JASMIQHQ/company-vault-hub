begin;

-- Read-only tenant boundaries for organization-scoped operational data.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='activity_log' and policyname='activity_log_member_select') then
    create policy activity_log_member_select on public.activity_log for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_recommendations' and policyname='ai_recommendations_member_select') then
    create policy ai_recommendations_member_select on public.ai_recommendations for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_member_select') then
    create policy notifications_member_select on public.notifications for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_calendar' and policyname='procurement_calendar_member_select') then
    create policy procurement_calendar_member_select on public.procurement_calendar for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_events' and policyname='procurement_events_member_select') then
    create policy procurement_events_member_select on public.procurement_events for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_knowledge' and policyname='procurement_knowledge_member_select') then
    create policy procurement_knowledge_member_select on public.procurement_knowledge for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_notifications' and policyname='procurement_notifications_member_select') then
    create policy procurement_notifications_member_select on public.procurement_notifications for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_tasks' and policyname='procurement_tasks_member_select') then
    create policy procurement_tasks_member_select on public.procurement_tasks for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='proposal_templates' and policyname='proposal_templates_member_select') then
    create policy proposal_templates_member_select on public.proposal_templates for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='proposal_versions' and policyname='proposal_versions_member_select') then
    create policy proposal_versions_member_select on public.proposal_versions for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tender_decisions' and policyname='tender_decisions_member_select') then
    create policy tender_decisions_member_select on public.tender_decisions for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tender_eligibility' and policyname='tender_eligibility_member_select') then
    create policy tender_eligibility_member_select on public.tender_eligibility for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tender_outcomes' and policyname='tender_outcomes_member_select') then
    create policy tender_outcomes_member_select on public.tender_outcomes for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_activity' and policyname='workspace_activity_member_select') then
    create policy workspace_activity_member_select on public.workspace_activity for select to authenticated using (organization_id = public.current_organization_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_settings' and policyname='workspace_settings_member_select') then
    create policy workspace_settings_member_select on public.workspace_settings for select to authenticated using (organization_id = public.current_organization_id());
  end if;
end $$;

commit;
