create table if not exists public.tender_lots (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  lot_number text not null,
  lot_title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tender_lots_lot_number_check check (length(trim(lot_number)) > 0),
  constraint tender_lots_lot_title_check check (length(trim(lot_title)) > 0),
  constraint tender_lots_tender_lot_unique unique (tender_id, lot_number)
);

alter table public.tender_requirements
  add column if not exists lot_id uuid references public.tender_lots(id) on delete set null;

create index if not exists tender_lots_tender_id_idx on public.tender_lots(tender_id);
create index if not exists tender_lots_organization_id_idx on public.tender_lots(organization_id);
create index if not exists tender_requirements_lot_id_idx on public.tender_requirements(lot_id);

alter table public.tender_lots enable row level security;

create policy tender_lots_org_company_access
on public.tender_lots
for all
to public
using (
  is_org_member(organization_id)
  and exists (
    select 1 from public.companies c
    where c.id = tender_lots.company_id
      and c.organization_id = tender_lots.organization_id
      and c.is_active = true
  )
)
with check (
  is_org_member(organization_id)
  and exists (
    select 1 from public.companies c
    where c.id = tender_lots.company_id
      and c.organization_id = tender_lots.organization_id
      and c.is_active = true
  )
);
