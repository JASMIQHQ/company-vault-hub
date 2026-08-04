import { useState, type ChangeEvent } from "react";
import { Loader2, UploadCloud } from "lucide-react";
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
  const upload = useUploadDocument();
  const { session } = useSession();
  const companiesQuery = useCompanies(session, organizationId);
  const companies = companiesQuery.data ?? [];

  const reset = () => {
    setFile(null);
    setDocumentName("");
    setDocumentType("");
    setCompanyId(null);
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

  const onSubmit = async () => {
    if (!file) return;
    if (!companyId) {
      toast.error("Select the company this document belongs to.");
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
      });
      toast.success("Document uploaded");
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
          <DialogDescription>PDF, PNG, JPG or JPEG — up to 25MB.</DialogDescription>
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
        </div>

        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={!file || !companyId || upload.isPending}
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
