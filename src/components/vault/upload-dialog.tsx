import { useMemo, useState, type ChangeEvent } from "react";
import { CalendarDays, Check, FileSearch, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyPicker } from "@/components/vault/company-picker";
import { useCompanies } from "@/hooks/use-companies";
import { useSession, useUploadDocument } from "@/hooks/use-vault";
import { ACCEPT_ATTRIBUTE, validateFile } from "@/lib/vault";

function suggestDocumentIdentity(filename: string) {
  const normalized = filename.toLowerCase().replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1];
  const rules: Array<{ pattern: RegExp; name: string; type: string }> = [
    { pattern: /\b(tcc|tax clearance|tax clearance certificate|firs)\b/i, name: "Tax Clearance Certificate", type: "TCC" },
    { pattern: /\b(pencom|pension compliance|pension commission)\b/i, name: "PENCOM Compliance", type: "PENCOM" },
    { pattern: /\b(itf|industrial training fund)\b/i, name: "ITF Compliance", type: "ITF" },
    { pattern: /\b(nsitf|social insurance trust fund)\b/i, name: "NSITF Compliance", type: "NSITF" },
    { pattern: /\b(bpp|bureau of public procurement|irr)\b/i, name: "BPP Registration / IRR", type: "BPP" },
    { pattern: /\b(cac|certificate of incorporation|incorporation)\b/i, name: "CAC Certificate", type: "CAC CERTIFICATE" },
    { pattern: /\b(audit|audited|financial statements?)\b/i, name: "Audited Financial Statements", type: "AUDITED ACCOUNTS" },
    { pattern: /\b(bank reference|bankref|reference letter)\b/i, name: "Bank Reference", type: "BANK REFERENCE" },
    { pattern: /\b(company profile|profile)\b/i, name: "Company Profile", type: "COMPANY PROFILE" },
    { pattern: /\b(affidavit|sworn)\b/i, name: "Sworn Affidavit", type: "SWORN AFFIDAVIT" },
  ];
  const match = rules.find((rule) => rule.pattern.test(normalized));
  if (!match) return null;
  return { name: year && /accounts|statements/i.test(match.name) ? `${match.name} ${year}` : year ? `${match.name} ${year}` : match.name, type: match.type, source: filename };
}

export function UploadDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasExpiry, setHasExpiry] = useState<"yes" | "no" | "">("");
  const [expiryDate, setExpiryDate] = useState("");
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const upload = useUploadDocument();
  const { session } = useSession();
  const companiesQuery = useCompanies(session, organizationId);
  const companies = companiesQuery.data ?? [];

  const suggestion = useMemo(() => file ? suggestDocumentIdentity(file.name) : null, [file]);

  const reset = () => {
    setFile(null);
    setDocumentName("");
    setDocumentType("");
    setCompanyId(null);
    setHasExpiry("");
    setExpiryDate("");
    setSuggestionDismissed(false);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) { setFile(null); return; }
    const error = validateFile(selected);
    if (error) { toast.error(error); event.target.value = ""; setFile(null); return; }
    setFile(selected);
    setSuggestionDismissed(false);
    if (!documentName) setDocumentName(selected.name.replace(/\.[^.]+$/, ""));
  };

  const useSuggestion = () => {
    if (!suggestion) return;
    setDocumentName(suggestion.name);
    setDocumentType(suggestion.type);
    setSuggestionDismissed(true);
  };

  const onExpiryChange = (value: "yes" | "no") => {
    setHasExpiry(value);
    if (value === "no") setExpiryDate("");
  };

  const onSubmit = async () => {
    if (!file) return;
    if (!companyId) { toast.error("Select the company this document belongs to."); return; }
    if (!hasExpiry) { toast.error("Tell JASMIQ whether this document expires."); return; }
    if (hasExpiry === "yes" && !expiryDate) { toast.error("Choose the document expiration date."); return; }
    try {
      await upload.mutateAsync({ file, documentName: documentName.trim() || file.name, documentType: documentType.trim() || "unspecified", category: "corporate", organizationId, companyId, expiryDate: hasExpiry === "yes" ? expiryDate : null });
      toast.success(hasExpiry === "yes" ? "Document uploaded with expiry date" : "Document uploaded — no expiry recorded");
      reset();
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-elegant"><UploadCloud className="mr-2 size-4" />Upload document</Button>
      </DialogTrigger>
      <DialogContent className="glass-panel max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Add the document and record its validity now. JASMIQ will use this metadata when checking tender compliance.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CompanyPicker id="vault-company-select" organizationId={organizationId} companies={companies} value={companyId} onChange={setCompanyId} />
          <div className="space-y-2">
            <Label htmlFor="vault-file">File</Label>
            <Input id="vault-file" type="file" accept={ACCEPT_ATTRIBUTE} onChange={onFileChange} className="rounded-xl" />
          </div>

          {suggestion && !suggestionDismissed ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><FileSearch className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">JASMIQ suggests a Vault label</p>
                    <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">Shadow suggestion</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Based only on the uploaded filename. Nothing is overwritten automatically.</p>
                  <div className="mt-3 rounded-xl border border-white/10 bg-background/35 px-3 py-2.5">
                    <p className="truncate text-xs font-semibold">{suggestion.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Type: {suggestion.type}</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" size="sm" className="w-full rounded-xl sm:w-auto" onClick={useSuggestion}><Check className="mr-1.5 size-3.5" />Use suggestion</Button>
                    <Button type="button" variant="ghost" size="sm" className="w-full rounded-xl sm:w-auto" onClick={() => setSuggestionDismissed(true)}>Keep filename</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="vault-name">Document name</Label>
            <Input id="vault-name" value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Certificate of Incorporation" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vault-type">Document type</Label>
            <Input id="vault-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="CAC_CERT" className="rounded-xl" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/35 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><CalendarDays className="size-4" /></div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="vault-expiry" className="text-sm font-semibold">Does this document expire?</Label>
                <p className="mt-1 text-xs text-muted-foreground">Record the date from the document. This is the source of truth for expiry checks.</p>
                <select id="vault-expiry" value={hasExpiry} onChange={(event) => onExpiryChange(event.target.value as "yes" | "no")} className="mt-3 h-10 w-full rounded-xl border border-border/70 bg-background/70 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <option value="">Select one</option><option value="yes">Yes — this document expires</option><option value="no">No — this document does not expire</option>
                </select>
                {hasExpiry === "yes" ? <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3"><Label htmlFor="vault-expiry-date" className="text-xs font-medium">Expiration date</Label><Input id="vault-expiry-date" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className="mt-2 rounded-xl bg-background/80" aria-label="Document expiration date" /><p className="mt-2 text-[11px] text-muted-foreground">You can choose the date from the calendar or enter it directly.</p></div> : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={!file || !companyId || !hasExpiry || (hasExpiry === "yes" && !expiryDate) || upload.isPending} className="w-full rounded-xl sm:w-auto">{upload.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
