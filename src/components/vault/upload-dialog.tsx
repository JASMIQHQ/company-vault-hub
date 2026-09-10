import { useState, type ChangeEvent } from "react";
import { CalendarDays, Loader2, UploadCloud } from "lucide-react";
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
import { useSession, useUploadDocument } from "@/hooks/use-vault";
import { ACCEPT_ATTRIBUTE, validateFile } from "@/lib/vault";

export function UploadDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasExpiry, setHasExpiry] = useState<"yes" | "no" | "">("");
  const [expiryDate, setExpiryDate] = useState("");
  const upload = useUploadDocument();
  const { session } = useSession();
  const companiesQuery = useCompanies(session, organizationId);
  const companies = companiesQuery.data ?? [];

  const reset = () => {
    setFile(null);
    setDocumentName("");
    setDocumentType("");
    setCompanyId(null);
    setHasExpiry("");
    setExpiryDate("");
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    const error = validateFile(selected);
    if (error) {
      toast.error(error);
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
    if (!documentName) setDocumentName(selected.name.replace(/\.[^.]+$/, ""));
  };

  const onExpiryChange = (value: "yes" | "no") => {
    setHasExpiry(value);
    if (value === "no") setExpiryDate("");
  };

  const onSubmit = async () => {
    if (!file) return;
    if (!companyId) {
      toast.error("Select the company this document belongs to.");
      return;
    }
    if (!hasExpiry) {
      toast.error("Tell JASMIQ whether this document expires.");
      return;
    }
    if (hasExpiry === "yes" && !expiryDate) {
      toast.error("Choose the document expiration date.");
      return;
    }
    try {
      await upload.mutateAsync({
        file,
        documentName: documentName.trim() || file.name,
        documentType: documentType.trim() || "unspecified",
        category: "corporate",
        organizationId,
        companyId,
        expiryDate: hasExpiry === "yes" ? expiryDate : null,
      });
      toast.success(hasExpiry === "yes" ? "Document uploaded with expiry date" : "Document uploaded — no expiry recorded");
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-elegant">
          <UploadCloud className="mr-2 size-4" />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Add the document and record its validity now. JASMIQ will use this metadata when checking tender compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CompanyPicker
            id="vault-company-select"
            organizationId={organizationId}
            companies={companies}
            value={companyId}
            onChange={setCompanyId}
          />
          <div className="space-y-2">
            <Label htmlFor="vault-file">File</Label>
            <Input
              id="vault-file"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={onFileChange}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vault-name">Document name</Label>
            <Input
              id="vault-name"
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder="Certificate of Incorporation"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vault-type">Document type</Label>
            <Input
              id="vault-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              placeholder="CAC_CERT"
              className="rounded-xl"
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/35 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="vault-expiry" className="text-sm font-semibold">
                  Does this document expire?
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Record the date from the document. This is the source of truth for expiry checks.
                </p>
                <select
                  id="vault-expiry"
                  value={hasExpiry}
                  onChange={(event) => onExpiryChange(event.target.value as "yes" | "no")}
                  className="mt-3 h-10 w-full rounded-xl border border-border/70 bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select one</option>
                  <option value="yes">Yes — this document expires</option>
                  <option value="no">No — this document does not expire</option>
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
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      You can choose the date from the calendar or enter it directly.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={!file || !companyId || !hasExpiry || (hasExpiry === "yes" && !expiryDate) || upload.isPending}
            className="rounded-xl w-full sm:w-auto"
          >
            {upload.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
