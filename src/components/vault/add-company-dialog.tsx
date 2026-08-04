import { useState, type ReactNode } from "react";
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
import { useCreateCompany, type Company } from "@/hooks/use-companies";

interface AddCompanyDialogProps {
  organizationId: string;
  trigger?: ReactNode;
  onCreated?: (company: Company) => void;
}

export function AddCompanyDialog({ organizationId, trigger, onCreated }: AddCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [tin, setTin] = useState("");
  const create = useCreateCompany();

  const reset = () => {
    setLegalName("");
    setRegistrationNumber("");
    setTin("");
  };

  const onSubmit = async () => {
    if (!legalName.trim()) return;
    try {
      const company = await create.mutateAsync({
        organizationId,
        legalName: legalName.trim(),
        registrationNumber,
        taxIdentificationNumber: tin,
      });
      toast.success(`${company.legal_name} added`);
      reset();
      setOpen(false);
      onCreated?.(company);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the company");
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
          <Button variant="outline" className="rounded-xl">
            <Plus className="mr-2 size-4" />
            Add Company
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add company</DialogTitle>
          <DialogDescription>
            Companies group the documents inside this organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-legal-name">Legal name</Label>
            <Input
              id="company-legal-name"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              placeholder="Systems and Machines Biz Ltd"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-rc">Registration number (optional)</Label>
            <Input
              id="company-rc"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
              placeholder="RC123456"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-tin">TIN (optional)</Label>
            <Input
              id="company-tin"
              value={tin}
              onChange={(event) => setTin(event.target.value)}
              placeholder="01234567-0001"
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={!legalName.trim() || create.isPending}
            className="rounded-xl w-full sm:w-auto"
          >
            {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
