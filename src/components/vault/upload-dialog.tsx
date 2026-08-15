import { useMemo, useState, type ChangeEvent } from "react";
import { CheckCircle2, FileArchive, FileSpreadsheet, FileText, Image, Loader2, Trash2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyPicker } from "@/components/vault/company-picker";
import { useCompanies } from "@/hooks/use-companies";
import { useSession, useUploadDocument } from "@/hooks/use-vault";
import { ACCEPT_ATTRIBUTE, validateFile } from "@/lib/vault";

type QueueStatus = "ready" | "uploading" | "success" | "error";
type QueueItem = {
  id: string;
  file: File;
  documentName: string;
  documentType: string;
  category: string;
  status: QueueStatus;
  error?: string;
};

const CATEGORIES = [
  { value: "company_profile", label: "Company Profile" },
  { value: "corporate", label: "Corporate / Registration" },
  { value: "tax_compliance", label: "Tax & Compliance" },
  { value: "certifications", label: "Certifications" },
  { value: "past_experience", label: "Past Experience" },
  { value: "financial", label: "Financial" },
  { value: "bank_reference", label: "Bank Reference" },
  { value: "personnel", label: "Personnel" },
  { value: "other", label: "Other" },
] as const;

function suggestMetadata(filename: string) {
  const normalized = filename.toLowerCase().replace(/[_-]+/g, " ");
  if (/company profile|profile|capability statement/.test(normalized)) return { category: "company_profile", documentType: "COMPANY_PROFILE" };
  if (/cac|certificate of incorporation|incorporation|registration/.test(normalized)) return { category: "corporate", documentType: "CAC_CERT" };
  if (/tcc|tax clearance|tax certificate|tin|tax/.test(normalized)) return { category: "tax_compliance", documentType: "TAX_COMPLIANCE" };
  if (/iso|certificate|certification|accreditation/.test(normalized)) return { category: "certifications", documentType: "CERTIFICATION" };
  if (/past job|past experience|completion certificate|award letter|contract award|experience/.test(normalized)) return { category: "past_experience", documentType: "PAST_EXPERIENCE" };
  if (/bank reference|bank ref/.test(normalized)) return { category: "bank_reference", documentType: "BANK_REFERENCE" };
  if (/statement|financial|audited|account|turnover|boq|bill of quantities|pricing|financial bid|excel|schedule of rates/.test(normalized)) return { category: "financial", documentType: "FINANCIAL" };
  if (/cv|resume|personnel|staff|key personnel/.test(normalized)) return { category: "personnel", documentType: "PERSONNEL" };
  return { category: "other", documentType: "OTHER" };
}

function getFileIcon(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return FileSpreadsheet;
  if (name.endsWith(".pdf") || name.endsWith(".docx")) return FileText;
  if (/\.(png|jpg|jpeg)$/.test(name)) return Image;
  return FileArchive;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const upload = useUploadDocument();
  const { session } = useSession();
  const companiesQuery = useCompanies(session, organizationId);
  const companies = companiesQuery.data ?? [];

  const activeCount = queue.filter((item) => item.status === "uploading").length;
  const successCount = queue.filter((item) => item.status === "success").length;
  const readyCount = queue.filter((item) => item.status === "ready").length;
  const allDone = queue.length > 0 && readyCount === 0 && activeCount === 0;
  const overallProgress = useMemo(() => queue.length ? Math.round((successCount / queue.length) * 100) : 0, [queue.length, successCount]);

  const reset = () => {
    setQueue([]);
    setCompanyId(null);
  };

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const accepted: QueueItem[] = [];
    for (const file of selected) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      const suggestion = suggestMetadata(file.name);
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        documentName: file.name.replace(/\.[^.]+$/, ""),
        documentType: suggestion.documentType,
        category: suggestion.category,
        status: "ready",
      });
    }
    setQueue((current) => [...current, ...accepted]);
  };

  const removeItem = (id: string) => setQueue((current) => current.filter((item) => item.id !== id));
  const updateMetadata = (id: string, field: "documentName" | "documentType" | "category", value: string) => updateItem(id, { [field]: value });

  const uploadQueue = async () => {
    if (!companyId) {
      toast.error("Select the company these documents belong to.");
      return;
    }
    const work = queue.filter((item) => item.status === "ready");
    if (!work.length) return;

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const item = work[cursor++];
        if (!item) return;
        updateItem(item.id, { status: "uploading", error: undefined });
        try {
          await upload.mutateAsync({
            file: item.file,
            documentName: item.documentName.trim() || item.file.name,
            documentType: item.documentType.trim() || "OTHER",
            category: item.category,
            organizationId,
            companyId,
          });
          updateItem(item.id, { status: "success" });
        } catch (error) {
          updateItem(item.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
        }
      }
    };
    await Promise.all([worker(), worker()]);
    toast.success("Vault intake completed");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && activeCount === 0) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-elegant"><UploadCloud className="mr-2 size-4" />Add to company vault</Button>
      </DialogTrigger>
      <DialogContent className="glass-panel max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Build your company vault</DialogTitle>
          <DialogDescription>Add several company documents at once. JASMIQ suggests the filing category from each filename; you can change anything before upload.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <CompanyPicker id="vault-company-select" organizationId={organizationId} companies={companies} value={companyId} onChange={setCompanyId} />

          <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-5 backdrop-blur-md">
            <Label htmlFor="vault-file" className="mb-2 block">Select documents</Label>
            <Input id="vault-file" type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={onFileChange} className="rounded-xl" />
            <p className="mt-2 text-xs text-muted-foreground">PDF, DOCX, XLSX, JPG, JPEG or PNG · maximum 25MB per file</p>
          </div>

          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Intake queue</p>
                  <p className="text-xs text-muted-foreground">{successCount} of {queue.length} uploaded · {activeCount} active</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-1.5" />

              <div className="space-y-2">
                {queue.map((item) => {
                  const Icon = getFileIcon(item.file);
                  const disabled = item.status === "uploading" || item.status === "success";
                  return (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/35 p-3 backdrop-blur-md">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl border border-border/60 bg-background/50 p-2"><Icon className="size-4 text-muted-foreground" /></div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0"><p className="truncate text-sm font-medium">{item.file.name}</p><p className="text-xs text-muted-foreground">{formatSize(item.file.size)}</p></div>
                            {item.status === "uploading" && <Loader2 className="size-4 animate-spin text-primary" />}
                            {item.status === "success" && <CheckCircle2 className="size-4 text-emerald-500" />}
                            {item.status === "error" && <XCircle className="size-4 text-destructive" />}
                            {item.status === "ready" && <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-4" /></button>}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
                            <Input value={item.documentName} disabled={disabled} onChange={(event) => updateMetadata(item.id, "documentName", event.target.value)} placeholder="Document name" className="rounded-xl" />
                            <Input value={item.documentType} disabled={disabled} onChange={(event) => updateMetadata(item.id, "documentType", event.target.value)} placeholder="Document type" className="rounded-xl" />
                            <Select value={item.category} disabled={disabled} onValueChange={(value) => updateMetadata(item.id, "category", value)}>
                              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>{CATEGORIES.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>

                          {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                          {item.status === "success" && <p className="text-xs text-emerald-600 dark:text-emerald-400">Vaulted · awaiting intelligence</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground sm:max-w-sm">Files are processed with a maximum of two active uploads at a time.</p>
          <Button onClick={uploadQueue} disabled={!companyId || readyCount === 0 || activeCount > 0} className="rounded-xl">
            {activeCount > 0 && <Loader2 className="mr-2 size-4 animate-spin" />}
            {allDone ? "Done" : `Upload ${readyCount || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
