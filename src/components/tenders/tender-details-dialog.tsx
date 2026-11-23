import { useEffect, useState } from "react";
import { PencilLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TenderListItem } from "@/lib/tenders";
import { useUpdateTenderDetails } from "@/hooks/use-tenders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type FormState = {
  title: string;
  procuring_entity: string;
  reference_number: string;
  procurement_method: string;
  tender_type: string;
  industry: string;
  submission_deadline: string;
  opening_date: string;
  requires_bid_security: boolean;
  requires_bank_reference: boolean;
  requires_affidavit: boolean;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function initialForm(tender: TenderListItem): FormState {
  return {
    title: tender.title ?? "",
    procuring_entity: tender.procuring_entity ?? "",
    reference_number: tender.reference_number ?? "",
    procurement_method: tender.procurement_method ?? "",
    tender_type: tender.tender_type ?? "",
    industry: tender.industry ?? "",
    submission_deadline: toLocalInput(tender.submission_deadline),
    opening_date: toLocalInput(tender.opening_date),
    requires_bid_security: Boolean(tender.requires_bid_security),
    requires_bank_reference: Boolean(tender.requires_bank_reference),
    requires_affidavit: Boolean(tender.requires_affidavit),
  };
}

export function TenderDetailsDialog({ tender, organizationId }: { tender: TenderListItem; organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(tender));
  const update = useUpdateTenderDetails();

  useEffect(() => {
    if (open) setForm(initialForm(tender));
  }, [open, tender]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      toast.error("Tender title is required.");
      return;
    }
    try {
      await update.mutateAsync({
        tenderId: tender.id,
        organizationId,
        details: {
          title,
          procuring_entity: form.procuring_entity.trim() || null,
          reference_number: form.reference_number.trim() || null,
          procurement_method: form.procurement_method.trim() || null,
          tender_type: form.tender_type.trim() || null,
          industry: form.industry.trim() || null,
          submission_deadline: fromLocalInput(form.submission_deadline),
          opening_date: fromLocalInput(form.opening_date),
          requires_bid_security: form.requires_bid_security,
          requires_bank_reference: form.requires_bank_reference,
          requires_affidavit: form.requires_affidavit,
          notes: tender.notes ?? null,
        },
      });
      toast.success("Tender details updated.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update tender details.");
    }
  };

  const textField = (key: Exclude<keyof FormState, "requires_bid_security" | "requires_bank_reference" | "requires_affidavit" | "submission_deadline" | "opening_date">, label: string) => (
    <div className="space-y-1.5" key={key}>
      <Label htmlFor={`tender-${key}`}>{label}</Label>
      <Input id={`tender-${key}`} value={form[key]} onChange={(event) => set(key, event.target.value)} className="rounded-xl" />
    </div>
  );

  const dateField = (key: "submission_deadline" | "opening_date", label: string) => (
    <div className="space-y-1.5" key={key}>
      <Label htmlFor={`tender-${key}`}>{label}</Label>
      <Input id={`tender-${key}`} type="datetime-local" value={form[key]} onChange={(event) => set(key, event.target.value)} className="rounded-xl" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><PencilLine className="size-4" /><span className="ml-2">Edit details</span></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit tender details</DialogTitle>
          <DialogDescription>Update the tender record using its existing fields. Changes here do not alter the extracted requirement ledger.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("title", "Tender title")}
            {textField("procuring_entity", "Procuring entity")}
            {textField("reference_number", "Reference number")}
            {textField("procurement_method", "Procurement method")}
            {textField("tender_type", "Tender type")}
            {textField("industry", "Industry / sector")}
            {dateField("submission_deadline", "Submission deadline")}
            {dateField("opening_date", "Opening date")}
          </div>
          <fieldset className="space-y-3 rounded-xl border border-border/60 p-4">
            <legend className="px-1 text-sm font-medium">Tender requirements</legend>
            {([
              ["requires_bid_security", "Bid security required"],
              ["requires_bank_reference", "Bank reference required"],
              ["requires_affidavit", "Affidavit required"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={form[key]} onChange={(event) => set(key, event.target.checked)} className="size-4 rounded border-border" />
                {label}
              </label>
            ))}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="rounded-xl" disabled={update.isPending || !form.title.trim()}>
              {update.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
