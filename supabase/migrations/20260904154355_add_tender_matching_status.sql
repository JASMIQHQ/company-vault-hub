ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS matching_status text;

ALTER TABLE public.tenders
  DROP CONSTRAINT IF EXISTS tenders_matching_status_check;

ALTER TABLE public.tenders
  ADD CONSTRAINT tenders_matching_status_check
  CHECK (
    matching_status IS NULL
    OR matching_status = ANY (ARRAY[
      'MATCHING',
      'MATCHED',
      'MATCHING_REVIEW',
      'MATCHING_FAILED'
    ]::text[])
  );

COMMENT ON COLUMN public.tenders.matching_status IS
  'Tender-level evidence matching lifecycle signal. NULL means matching has not started; MATCHING means in progress; MATCHED means matcher completed without manual-review results; MATCHING_REVIEW means matcher completed with one or more manual-review results; MATCHING_FAILED means analysis succeeded but evidence matching failed.';
