-- Idempotent Storage setup for a fresh JASMIQ staging project.
-- Matches the existing production bucket visibility and names.
-- Run only against the explicitly linked staging project.
insert into storage.buckets (id, name, public)
values
  ('company-documents', 'company-documents', false),
  ('tender-files', 'tender-files', false)
on conflict (id) do update
set
  name = excluded.name,
  public = false;
