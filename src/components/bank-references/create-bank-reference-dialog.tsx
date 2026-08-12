import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { CompanySelect } from "@/components/company-select";
import type { Company } from "@/hooks/use-companies";
import type { BankReferenceMetadata, BankReferenceListItem } from "@/lib/bank-references";
import type { TenderOption } from "@/hooks/use-bank-reference-requests";
import { useCreateBankReferenceRequest } from "@/hooks/use-bank-reference-requests";

interface CreateBankReferenceDialogProps {
  organizationId: string;
  companies: Company[];
  tenders: TenderOption[];
  trigger?: ReactNode;
  onCreated?: (item: BankReferenceListItem) => void;
}

type FormState = {
  isTemplate: boolean;
  companyId: string;
  bankName: string;
  tenderId: string;
  requestDate: string;
  expectedDate: string;
  expiryDate: string;
  notes: string;
  recipientTitle: string;
  recipientOrganization: string;
  recipientAddress: string;
  projectTitle: string;
  lotNumber: string;
  facilityAmount: string;
  currency: string;
  purpose: string;
  authorizedSignatory: string;
};

const initialState: FormState = {
  isTemplate: false,
  companyId: "",
  bankName: "",
  tenderId: "",
  requestDate: "",
  expectedDate: "",
  expiryDate: "",
  notes: "",
  recipientTitle: "",
  recipientOrganization: "",
  recipientAddress: "",
  projectTitle: "",
  lotNumber: "",
  facilityAmount: "",
  currency: "NGN",
  purpose: "",
  authorizedSignatory: "",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function CreateBankReferenceDialog({
  organizationId,
  companies,
  tenders,
  trigger,
  onCreated,
}: CreateBankReferenceDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialState);
  const create = useCreateBankReferenceRequest();

  const companyOptions = useMemo(
    () => companies.map((company) => ({ id: company.id, name: company.legal_name })),
    [companies],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => setForm(initialState);

  const submit = async () => {
    if (!form.companyId || !form.bankName.trim()) {
      toast.error("Company and bank name are required.");
      return;
    }

    const metadata: BankReferenceMetadata = {};
    const textFields: Array<[keyof BankReferenceMetadata, string]> = [
      ["recipient_title", form.recipientTitle],
      ["recipient_organization", form.recipientOrganization],
      ["recipient_address", form.recipientAddress],
      ["project_title", form.projectTitle],
      ["lot_number", form.lotNumber],
      ["purpose", form.purpose],
      ["authorized_signatory", form.authorizedSignatory],
    ];
    for (const [key, value] of textFields) {
      if (value.trim()) metadata[key] = value.trim();
    }
    if (form.facilityAmount.trim()) {
      const amount = Number(form.facilityAmount.replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error("Facility amount must be a valid positive number.");
        return;
      }
      metadata.facility_amount = amount;
    }
    if (form.currency.trim()) metadata.currency = form.currency.trim().toUpperCase();

    try {
      const item = await create.mutateAsync({
        organizationId,
        companyId: form.companyId,
        bankName: form.bankName.trim(),
        tenderId: form.isTemplate ? null : form.tenderId || null,
        requestDate: form.isTemplate ? null : form.requestDate || null,
        expectedDate: form.isTemplate ? null : form.expectedDate || null,
        expiryDate: form.isTemplate ? null : form.expiryDate || null,
        notes: form.isTemplate ? null : form.notes.trim() || null,
        requestMetadata: metadata,
        isTemplate: form.isTemplate,
      });
      toast.success(form.isTemplate ? "Bank reference template created." : "Bank reference request created.");
      onCreated?.(item);
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create bank reference.");
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
        {trigger ?? (
          <Button className="rounded-xl">
            <Plus className="mr-2 size-4" />
            New Bank Reference
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.isTemplate ? "Create bank reference template" : "Create bank reference request"}</DialogTitle>
          <DialogDescription>
            {form.isTemplate
              ? "Save reusable bank-reference configuration without lifecycle dates or tender linkage."
              : "Create a bank-reference request for the active procurement organization."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${!form.isTemplate ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              onClick={() => set("isTemplate", false)}
            >
              Active Request
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${form.isTemplate ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              onClick={() => set("isTemplate", true)}
            >
              Template
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CompanySelect
              id="bank-reference-company"
              label="Company *"
              organizations={companyOptions}
              value={form.companyId}
              onChange={(value) => set("companyId", value)}
            />
            <Field label="Bank Name *">
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="Bank name" className="rounded-xl" />
            </Field>
            {!form.isTemplate && (
              <Field label="Tender">
                <select className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={form.tenderId} onChange={(e) => set("tenderId", e.target.value)}>
                  <option value="">No tender / independent</option>
                  {tenders.map((tender) => <option key={tender.id} value={tender.id}>{tender.title}</option>)}
                </select>
              </Field>
            )}
            {!form.isTemplate && (
              <>
                <Field label="Request Date"><Input type="date" value={form.requestDate} onChange={(e) => set("requestDate", e.target.value)} className="rounded-xl" /></Field>
                <Field label="Expected Date"><Input type="date" value={form.expectedDate} onChange={(e) => set("expectedDate", e.target.value)} className="rounded-xl" /></Field>
                <Field label="Expiry Date"><Input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} className="rounded-xl" /></Field>
              </>
            )}
          </div>

          {!form.isTemplate && (
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional request notes" className="rounded-xl" /></Field>
          )}

          <div>
            <p className="text-sm font-semibold">Recipient & facility metadata</p>
            <p className="mt-1 text-xs text-muted-foreground">Optional structured details stored in the existing request metadata field.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recipient Title"><Input value={form.recipientTitle} onChange={(e) => set("recipientTitle", e.target.value)} className="rounded-xl" placeholder="The Director-General" /></Field>
            <Field label="Recipient Organization"><Input value={form.recipientOrganization} onChange={(e) => set("recipientOrganization", e.target.value)} className="rounded-xl" /></Field>
            <Field label="Recipient Address"><Input value={form.recipientAddress} onChange={(e) => set("recipientAddress", e.target.value)} className="rounded-xl" /></Field>
            <Field label="Project Title"><Input value={form.projectTitle} onChange={(e) => set("projectTitle", e.target.value)} className="rounded-xl" /></Field>
            <Field label="Lot Number"><Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} className="rounded-xl" /></Field>
            <Field label="Facility Amount"><Input inputMode="decimal" value={form.facilityAmount} onChange={(e) => set("facilityAmount", e.target.value)} className="rounded-xl" /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} className="rounded-xl" /></Field>
            <Field label="Authorized Signatory"><Input value={form.authorizedSignatory} onChange={(e) => set("authorizedSignatory", e.target.value)} className="rounded-xl" /></Field>
          </div>
          <Field label="Purpose"><Textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} className="rounded-xl" /></Field>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending || !form.companyId || !form.bankName.trim()} className="w-full rounded-xl sm:w-auto">
            {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {form.isTemplate ? "Create Template" : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
