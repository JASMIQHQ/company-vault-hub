import { describe, expect, test } from "bun:test";
import { summarizeUploadQueue, type UploadQueueStatusItem } from "./upload-queue";

describe("summarizeUploadQueue", () => {
  test("returns zero progress for an empty queue", () => {
    expect(summarizeUploadQueue([])).toMatchObject({
      total: 0,
      processed: 0,
      progressPercent: 0,
    });
  });

  test("counts terminal outcomes as processed", () => {
    const items: UploadQueueStatusItem[] = [
      { status: "success" },
      { status: "failed" },
      { status: "invalid" },
      { status: "duplicate" },
      { status: "queued" },
    ];

    expect(summarizeUploadQueue(items)).toMatchObject({
      total: 5,
      processed: 4,
      queued: 1,
      succeeded: 1,
      failed: 1,
      invalid: 1,
      duplicates: 1,
      progressPercent: 80,
    });
  });

  test("does not report hashing or uploading files as completed", () => {
    expect(
      summarizeUploadQueue([{ status: "hashing" }, { status: "uploading" }]),
    ).toMatchObject({
      total: 2,
      processed: 0,
      hashing: 1,
      uploading: 1,
      progressPercent: 0,
    });
  });
});
