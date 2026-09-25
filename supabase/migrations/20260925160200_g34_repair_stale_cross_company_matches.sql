-- G34 data repair: correct the known stale NITDA matches created before tender-company isolation was enforced.
-- Idempotent: maps the six stored matches to the corresponding active documents belonging to the tender company.

update public.tender_requirements
set matched_document_id = case requirement_name
  when 'Evidence of Registration with CAC' then 'c0d0ec72-9483-46a9-909c-0502584f51e9'::uuid
  when 'Evidence of Tax Clearance Certificate' then '18ffba6d-7a0d-4ac3-9ac9-759bfd64f6fa'::uuid
  when 'Evidence of Compliance with PENCOM' then 'c3357dee-374a-4bf8-a6ed-004bb0144f88'::uuid
  when 'Evidence of Compliance with NSITF' then '0344552d-ee2a-4b32-972b-ae2249cf11b0'::uuid
  when 'Evidence of Compliance with ITF' then '0d83db5a-748c-4cfb-8f35-7ae847fee6dc'::uuid
  when 'Evidence of Updated Registration on BPP Portal' then 'ff5fb2ca-738e-41be-9001-246d9508ddf3'::uuid
  else matched_document_id end
where tender_id='ebbcf931-3125-485c-bb76-3611cbcbae20'
  and requirement_name in ('Evidence of Registration with CAC','Evidence of Tax Clearance Certificate','Evidence of Compliance with PENCOM','Evidence of Compliance with NSITF','Evidence of Compliance with ITF','Evidence of Updated Registration on BPP Portal');

update public.compliance_matches cm
set document_id = case
  when cm.requirement like 'Evidence of Registration with CAC.%' then 'c0d0ec72-9483-46a9-909c-0502584f51e9'::uuid
  when cm.requirement like 'Evidence of Tax Clearance Certificate.%' then '18ffba6d-7a0d-4ac3-9ac9-759bfd64f6fa'::uuid
  when cm.requirement like 'Evidence of Compliance with PENCOM.%' then 'c3357dee-374a-4bf8-a6ed-004bb0144f88'::uuid
  when cm.requirement like 'Evidence of Compliance with NSITF.%' then '0344552d-ee2a-4b32-972b-ae2249cf11b0'::uuid
  when cm.requirement like 'Evidence of Compliance with ITF.%' then '0d83db5a-748c-4cfb-8f35-7ae847fee6dc'::uuid
  when cm.requirement like 'Evidence of Updated Registration on BPP Portal.%' then 'ff5fb2ca-738e-41be-9001-246d9508ddf3'::uuid
  else cm.document_id end
where cm.tender_id='ebbcf931-3125-485c-bb76-3611cbcbae20'
  and cm.status='matched'
  and cm.requirement like any (array['Evidence of Registration with CAC.%','Evidence of Tax Clearance Certificate.%','Evidence of Compliance with PENCOM.%','Evidence of Compliance with NSITF.%','Evidence of Compliance with ITF.%','Evidence of Updated Registration on BPP Portal.%']);
