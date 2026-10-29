begin;

-- Organization metadata and derived read-only analytics are tenant-scoped.
-- These policies intentionally grant SELECT only; mutation remains backend-controlled.

create policy organizations_member_select on public.organizations
for select to authenticated
using (id = public.current_organization_id());

grant select on public.organizations to authenticated;

create policy organization_health_member_select on public.organization_health
for select to authenticated
using (organization_id = public.current_organization_id());
grant select on public.organization_health to authenticated;

create policy organization_metrics_member_select on public.organization_metrics
for select to authenticated
using (organization_id = public.current_organization_id());
grant select on public.organization_metrics to authenticated;

create policy organization_statistics_member_select on public.organization_statistics
for select to authenticated
using (organization_id = public.current_organization_id());
grant select on public.organization_statistics to authenticated;

create policy organization_readiness_history_member_select on public.organization_readiness_history
for select to authenticated
using (organization_id = public.current_organization_id());
grant select on public.organization_readiness_history to authenticated;

create policy readiness_history_member_select on public.readiness_history
for select to authenticated
using (organization_id = public.current_organization_id());
grant select on public.readiness_history to authenticated;

create policy roles_member_select on public.roles
for select to authenticated
using (organization_id = public.current_organization_id());
grant select on public.roles to authenticated;

commit;
