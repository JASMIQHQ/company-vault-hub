export type UploadQueueStatus =
  | "hashing"
  | "queued"
  | "uploading"
  | "success"
  | "failed"
  | "invalid"
  | "duplicate";

export interface UploadQueueStatusItem {
  status: UploadQueueStatus;
}

export interface UploadQueueSummary {
  total: number;
  processed: number;
  queued: number;
  hashing: number;
  uploading: number;
  succeeded: number;
  failed: number;
  invalid: number;
  duplicates: number;
  progressPercent: number;
}

export function summarizeUploadQueue(items: UploadQueueStatusItem[]): UploadQueueSummary {
  const count = (status: UploadQueueStatus) =>
    items.filter((item) => item.status === status).length;
  const succeeded = count("success");
  const failed = count("failed");
  const invalid = count("invalid");
  const duplicates = count("duplicate");
  const processed = succeeded + failed + invalid + duplicates;
  const total = items.length;

  return {
    total,
    processed,
    queued: count("queued"),
    hashing: count("hashing"),
    uploading: count("uploading"),
    succeeded,
    failed,
    invalid,
    duplicates,
    progressPercent: total === 0 ? 0 : Math.round((processed / total) * 100),
  };
}
