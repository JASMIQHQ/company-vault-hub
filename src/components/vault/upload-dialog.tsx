import { useMemo, useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CompanyPicker } from "@/components/vault/company-picker";
import { useCompanies } from "@/hooks/use-companies";
import {
  useDocuments,
  useSession,
  useUploadDocument,
} from "@/hooks/use-vault";
import { findCompanyDuplicate, type DuplicateCandidate } from "@/lib/vault-duplicates";
import { summarizeUploadQueue, type UploadQueueStatus } from "@/lib/upload-queue";
import { ACCEPT_ATTRIBUTE, sha256Hex, validateFile } from "@/lib/vault";

interface UploadQueueItem {
  id: string;
  file: File;
  documentName: string;
  status: UploadQueueStatus;
  hash?: string;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: UploadQueueStatus): string {
  switch (status) {
    case "hashing":
      return "Checking file";
    case "queued":
      return "Ready";
    case "uploading":
      return "Uploading";
    case "success":
      return "Uploaded";
    case "failed":
      return "Failed";
    case "invalid":
      return "Invalid file";
    case "duplicate":
      return "Duplicate";
  }
}

function statusClass(status: UploadQueueStatus): string {
  switch (status) {
    case "success":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300";
    case "failed":
    case "invalid":
      return "border-red-400/20 bg-red-400/10 text-red-700 dark:text-red-300";
    case "duplicate":
      return "border-amber-400/20 bg-amber-400/10 text-amber-800 dark:text-amber-200";
    case "hashing":
    case "uploading":
      return "border-primary/20 bg-primary/10 text-primary";
    default:
      return "border-border/70 bg-muted/50 text-muted-foreground";
  }
}

export function UploadDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [documentType, setDocumentType] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasExpiry, setHasExpiry] = useState<"yes" | "no" | "">("");
  const [expiryDate, setExpiryDate] = useState("");
  const [processingBatch, setProcessingBatch] = useState(false);
  const upload = useUploadDocument();
  const { session } = useSession();
  const companiesQuery = useCompanies(session, organizationId);
  const documentsQuery = useDocuments(session, organizationId);
  const companies = companiesQuery.data ?? [];
  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );
  const summary = useMemo(() => summarizeUploadQueue(queue), [queue]);

  const reset = () => {
    setQueue([]);
    setDocumentType("");
    setCompanyId(null);
    setHasExpiry("");
    setExpiryDate("");
  };

  const fingerprint = (item: UploadQueueItem) => {
    setQueue((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: "hashing", error: undefined }
          : entry,
      ),
    );
    void sha256Hex(item.file)
      .then((hash) => {
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, hash, status: "queued", error: undefined }
              : entry,
          ),
        );
      })
      .catch((error) => {
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "failed",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Could not calculate the file fingerprint.",
                }
              : entry,
          ),
        );
      });
  };

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const additions = selected.map((file): UploadQueueItem => {
      const validationError = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        documentName: file.name.replace(/\.[^.]+$/, ""),
        status: validationError ? "invalid" : "hashing",
        error: validationError ?? undefined,
      };
    });

    setQueue((current) => [...current, ...additions]);
    additions
      .filter((item) => item.status === "hashing")
      .forEach(fingerprint);
  };

  const updateDocumentName = (id: string, documentName: string) => {
    setQueue((current) =>
      current.map((item) =>
        item.id === id ? { ...item, documentName } : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  const retryItem = (item: UploadQueueItem) => {
    if (item.hash) {
      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "queued", error: undefined }
            : entry,
        ),
      );
      return;
    }
    fingerprint(item);
  };

  const retryFailed = () => {
    queue
      .filter((item) => item.status === "failed")
      .forEach(retryItem);
  };

  const onExpiryChange = (value: "yes" | "no") => {
    setHasExpiry(value);
    if (value === "no") setExpiryDate("");
  };

  const onSubmit = async () => {
    if (!companyId) {
      toast.error("Select the company these documents belong to.");
      return;
    }
    if (!hasExpiry) {
      toast.error("Tell JASMIQ whether these documents expire.");
      return;
    }
    if (hasExpiry === "yes" && !expiryDate) {
      toast.error("Choose the document expiration date.");
      return;
    }
    if (documentsQuery.isPending || documentsQuery.isError) {
      toast.error("JASMIQ cannot check for duplicates right now. Reload the Vault before uploading.");
      return;
    }

    const pendingItems = queue.filter((item) => item.status === "queued");
    if (pendingItems.length === 0) {
      toast.error("There are no ready files to upload. Add files or retry failed items.");
      return;
    }

    setProcessingBatch(true);
    let uploadedCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    try {
      const refreshed = await documentsQuery.refetch();
      if (refreshed.error) throw refreshed.error;
      const knownDocuments: DuplicateCandidate[] = [...(refreshed.data ?? [])];
      const seenHashes = new Set(
        queue
          .filter((item) => item.status === "success" && item.hash)
          .map((item) => item.hash as string),
      );

      for (const item of pendingItems) {
        if (!item.hash) {
          failedCount += 1;
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: "failed", error: "File fingerprint is missing. Retry this file." }
                : entry,
            ),
          );
          continue;
        }

        const existing = findCompanyDuplicate(knownDocuments, companyId, item.hash);
        if (existing || seenHashes.has(item.hash)) {
          duplicateCount += 1;
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "duplicate",
                    error: existing
                      ? `Already stored as “${existing.document_name}”.`
                      : "The same file has already been uploaded in this batch.",
                  }
                : entry,
            ),
          );
          continue;
        }

        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "uploading", error: undefined }
              : entry,
          ),
        );

        try {
          await upload.mutateAsync({
            file: item.file,
            documentName: item.documentName.trim() || item.file.name,
            documentType: documentType.trim() || "unspecified",
            category: "corporate",
            organizationId,
            companyId,
            expiryDate: hasExpiry === "yes" ? expiryDate : null,
          });
          uploadedCount += 1;
          seenHashes.add(item.hash);
          knownDocuments.push({
            company_id: companyId,
            sha256_hash: item.hash,
            deleted_at: null,
            document_status: "active",
            document_name: item.documentName,
          });
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: "success", error: undefined }
                : entry,
            ),
          );
        } catch (error) {
          failedCount += 1;
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "failed",
                    error:
                      error instanceof Error ? error.message : "Upload failed.",
                  }
                : entry,
            ),
          );
        }
      }

      await documentsQuery.refetch();
      if (uploadedCount > 0) {
        toast.success(
          `${uploadedCount} ${uploadedCount === 1 ? "document" : "documents"} uploaded successfully.`,
        );
      }
      if (duplicateCount > 0 || failedCount > 0) {
        toast.warning(
          `${duplicateCount} duplicate(s) skipped · ${failedCount} failed. You can retry failed files.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not refresh the Vault before upload.",
      );
    } finally {
      setProcessingBatch(false);
    }
  };

  const queueBusy = processingBatch || summary.hashing > 0 || summary.uploading > 0;
  const readyCount = summary.queued;
  const canUpload =
    Boolean(companyId) &&
    Boolean(hasExpiry) &&
    (hasExpiry !== "yes" || Boolean(expiryDate)) &&
    readyCount > 0 &&
    !queueBusy &&
    !documentsQuery.isPending &&
    !documentsQuery.isError;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (processingBatch && !next) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-elegant">
          <UploadCloud className="mr-2 size-4" />
          Upload documents
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            Add several company documents in one batch. Each file has its own name and result;
            document type and expiry settings apply to the whole batch.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <CompanyPicker
            id="vault-company-select"
            organizationId={organizationId}
            companies={companies}
            value={companyId}
            onChange={setCompanyId}
          />

          <div className="space-y-2">
            <Label htmlFor="vault-files">Files</Label>
            <Input
              id="vault-files"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              onChange={onFilesChange}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              PDF, PNG and JPEG files up to 25 MB each. Files are checked independently.
            </p>
          </div>

          {queue.length > 0 ? (
            <section className="rounded-2xl border border-border/60 bg-background/30 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Upload queue</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.processed} of {summary.total} files processed
                  </p>
                </div>
                {summary.failed > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={retryFailed}
                    disabled={queueBusy}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    Retry failed
                  </Button>
                ) : null}
              </div>
              <Progress value={summary.progressPercent} className="mt-3 h-2" />
              <div className="mt-3 space-y-2">
                {queue.map((item) => {
                  const existingDuplicate =
                    item.hash && companyId
                      ? findCompanyDuplicate(documents, companyId, item.hash)
                      : null;
                  const sameBatchDuplicate = item.hash
                    ? queue.find(
                        (candidate) =>
                          candidate.id !== item.id &&
                          candidate.hash === item.hash &&
                          candidate.status !== "invalid" &&
                          candidate.status !== "failed",
                      )
                    : null;
                  const displayStatus =
                    existingDuplicate || sameBatchDuplicate
                      ? "duplicate"
                      : item.status;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-background/45 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-all text-xs font-medium">{item.file.name}</p>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(displayStatus)}`}
                            >
                              {statusLabel(displayStatus)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatFileSize(item.file.size)}
                            </span>
                          </div>
                          <Input
                            value={item.documentName}
                            onChange={(event) =>
                              updateDocumentName(item.id, event.target.value)
                            }
                            aria-label={`Document name for ${item.file.name}`}
                            className="mt-2 h-8 rounded-lg text-xs"
                            disabled={item.status === "uploading" || item.status === "success"}
                          />
                          {existingDuplicate ? (
                            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                              Already stored as “{existingDuplicate.document_name}” in this company.
                            </p>
                          ) : null}
                          {sameBatchDuplicate && !existingDuplicate ? (
                            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                              This file is also present elsewhere in the current batch.
                            </p>
                          ) : null}
                          {item.error ? (
                            <p className="mt-1 break-words text-[11px] text-destructive">
                              {item.error}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {item.status === "failed" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg"
                              onClick={() => retryItem(item)}
                              disabled={queueBusy}
                              aria-label={`Retry ${item.file.name}`}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-muted-foreground"
                            onClick={() => removeItem(item.id)}
                            disabled={item.status === "uploading" || processingBatch}
                            aria-label={`Remove ${item.file.name} from queue`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
              <UploadCloud className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Your upload queue is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select one or more files to start.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vault-type">Document type</Label>
            <Input
              id="vault-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              placeholder="CAC_CERT"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              This document type will be applied to every file in this batch.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/35 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="vault-expiry" className="text-sm font-semibold">
                  Do these documents expire?
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  This expiry setting applies to every file in this batch. Record the date shown on
                  the documents.
                </p>
                <select
                  id="vault-expiry"
                  value={hasExpiry}
                  onChange={(event) => onExpiryChange(event.target.value as "yes" | "no")}
                  className="mt-3 h-10 w-full rounded-xl border border-border/70 bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select one</option>
                  <option value="yes">Yes — these documents expire</option>
                  <option value="no">No — these documents do not expire</option>
                </select>

                {hasExpiry === "yes" ? (
                  <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                    <Label htmlFor="vault-expiry-date" className="text-xs font-medium">
                      Expiration date
                    </Label>
                    <Input
                      id="vault-expiry-date"
                      type="date"
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                      className="mt-2 rounded-xl bg-background/80"
                      aria-label="Document expiration date"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {documentsQuery.isError ? (
            <p className="text-xs text-destructive">
              Duplicate checking is unavailable. Reload the Vault before uploading.
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => setQueue([])}
            disabled={queueBusy || queue.length === 0}
          >
            Clear queue
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canUpload || upload.isPending}
            className="w-full rounded-xl sm:w-auto"
          >
            {processingBatch || upload.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 size-4" />
            )}
            Upload {readyCount} {readyCount === 1 ? "file" : "files"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
