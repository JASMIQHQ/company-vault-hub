alter table public.tender_requirements drop constraint if exists tender_requirements_lot_org_consistency;
drop trigger if exists tender_lots_touch_updated_at on public.tender_lots;
drop function if exists public.touch_tender_lots_updated_at();
