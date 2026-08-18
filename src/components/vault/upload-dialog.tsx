import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CheckCircle2, FileText, Loader2, Plus, Trash2, UploadCloud, XCircle } from "lucide-react";
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
import { CompanyPicker } from "@/components/vault/company-picker";
import { useCompanies } from "@/hooks/use-companies";
import { useSession } from "@/hooks/use-vault";
import { DOCUMENT_TYPES_BY_CATEGORY, ACCEPT_ATTRIBUTE, VAULT_CATEGORIES, validateFile, formatFileSize } from "@/lib/vault";
import { uploadDocument } from "@/hooks/use-vault";

const MAX_CONCURRENT_UPLOADS = 2;

type QueueStatus = "queued" | "uploading" | "success" | "failed";

type QueueItem = {
  id: string;
  file: File;
  documentName: string;
  category: string;
  documentType: string;
  status: QueueStatus;
  error?: string;
};

function makeQueueItem(file: File): QueueItem {
  const category = "Other";
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    documentName: file.name.replace(/\.[^.]+$/, ""),
    category,
    documentType: DOCUMENT_TYPES_BY_CATEGORY[category][0],
    status: "queued",
  };
}

export function UploadDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { session } = useSession();
  const companiesQuery = useCompanies(session, organizationId);
  const companies = companiesQuery.data ?? [];

  const hasQueuedFiles = queue.some((item) => item.status === "queued");
  const hasFailures = queue.some((item) => item.status === "failed");
  const allComplete = queue.length > 0 && queue.every((item) => item.status === "success");

  const reset = () => {
    setQueue([]);
    setCompanyId(null);
    setIsUploading(false);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const accepted: QueueItem[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      accepted.push(makeQueueItem(file));
    }
    setQueue((current) => [...current, ...accepted]);
  };

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    if (isUploading) return;
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  const uploadQueue = async () => {
    if (!companyId) {
      toast.error("Select the company these documents belong to.");
      return;
    }

    const pendingIds = queue.filter((item) => item.status === "queued" || item.status === "failed").map((item) => item.id);
    if (!pendingIds.length) return;

    setIsUploading(true);
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= pendingIds.length) return;
        const id = pendingIds[index];
        const item = queue.find((candidate) => candidate.id === id);
        if (!item) continue;

        updateItem(id, { status: "uploading", error: undefined });
        try {
          await uploadDocument({
            file: item.file,
            documentName: item.documentName.trim() || item.file.name,
            documentType: item.documentType,
            category: item.category,
            organizationId,
            companyId,
          });
          updateItem(id, { status: "success" });
        } catch (error) {
          updateItem(id, {
            status: "failed",
            error: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, pendingIds.length) }, worker));
    setIsUploading(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const progressLabel = useMemo(() => {
    if (!queue.length) return "No files selected";
    const completed = queue.filter((item) => item.status === "success").length;
    return `${completed} of ${queue.length} uploaded`;
  }, [queue]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-elegant">
          <UploadCloud className="mr-2 size-4" />
          Add to Vault
        </Button>
      </DialogTrigger>

      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add documents to Company Vault</DialogTitle>
          <DialogDescription>
            Upload several documents at once. JASMIQ records the real file metadata and places every document in the selected company vault.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <CompanyPicker
            id="vault-company-select"
            organizationId={organizationId}
            companies={companies}
            value={companyId}
            onChange={setCompanyId}
          />

          <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-5 backdrop-blur-md">
            <Label htmlFor="vault-files" className="flex cursor-pointer flex-col items-center justify-center gap-2 py-5 text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="size-5" />
              </span>
              <span className="text-sm font-medium">Select or drop multiple files</span>
              <span className="text-xs text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG or JPEG · max 25MB each</span>
            </Label>
            <Input id="vault-files" type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={addFiles} className="sr-only" />
          </div>

          {queue.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressLabel}</span>
                <span>Maximum {MAX_CONCURRENT_UPLOADS} uploads at once</span>
              </div>

              {queue.map((item) => {
                const types = DOCUMENT_TYPES_BY_CATEGORY[item.category] ?? DOCUMENT_TYPES_BY_CATEGORY.Other;
                return (
                  <div key={item.id} className="rounded-2xl border border-border/60 bg-background/35 p-4 backdrop-blur-md">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.file.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                          </div>
                          {item.status === "uploading" ? <Loader2 className="size-4 shrink-0 animate-spin text-primary" /> : null}
                          {item.status === "success" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" /> : null}
                          {item.status === "failed" ? <XCircle className="size-4 shrink-0 text-destructive" /> : null}
                          {item.status === "queued" && !isUploading ? (
                            <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name}`}>
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`category-${item.id}`} className="text-[11px] text-muted-foreground">Category</Label>
                            <select
                              id={`category-${item.id}`}
                              value={item.category}
                              disabled={item.status === "uploading" || item.status === "success"}
                              onChange={(event) => {
                                const nextCategory = event.target.value;
                                updateItem(item.id, {
                                  category: nextCategory,
                                  documentType: DOCUMENT_TYPES_BY_CATEGORY[nextCategory][0],
                                });
                              }}
                              className="mt-1 flex h-9 w-full rounded-xl border border-input bg-background/70 px-3 text-sm"
                            >
                              {VAULT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor={`type-${item.id}`} className="text-[11px] text-muted-foreground">Document type</Label>
                            <select
                              id={`type-${item.id}`}
                              value={item.documentType}
                              disabled={item.status === "uploading" || item.status === "success"}
                              onChange={(event) => updateItem(item.id, { documentType: event.target.value })}
                              className="mt-1 flex h-9 w-full rounded-xl border border-input bg-background/70 px-3 text-sm"
                            >
                              {types.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </div>
                        </div>

                        <Input
                          value={item.documentName}
                          disabled={item.status === "uploading" || item.status === "success"}
                          onChange={(event) => updateItem(item.id, { documentName: event.target.value })}
                          className="mt-2 rounded-xl"
                          aria-label={`Document name for ${item.file.name}`}
                        />
                        {item.error ? <p className="mt-2 text-xs text-destructive">{item.error}</p> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)} disabled={isUploading}>Close</Button>
          <Button
            onClick={() => void uploadQueue()}
            disabled={!companyId || !hasQueuedFiles || isUploading}
            className="rounded-xl"
          >
            {isUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UploadCloud className="mr-2 size-4" />}
            {hasFailures && !isUploading ? "Retry failed uploads" : allComplete ? "Uploaded" : "Upload documents"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
