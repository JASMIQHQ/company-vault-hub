-- Corrective guard for staging replay: table-level UPDATE overrides column revokes.
-- Keep the existing company reassignment flow; all other tender changes use trusted paths/RPCs.
revoke update on public.tenders from authenticated;
grant update (company_id) on public.tenders to authenticated;
