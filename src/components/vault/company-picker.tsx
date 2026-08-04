import { Label } from "@/components/ui/label";
import { AddCompanyDialog } from "@/components/vault/add-company-dialog";
import { Button } from "@/components/ui/button";
import type { Company } from "@/hooks/use-companies";

interface CompanyPickerProps {
  id: string;
  label?: string;
  organizationId: string;
  companies: Company[];
  value: string | null;
  onChange: (companyId: string) => void;
}

/** Required company selector, with an inline escape hatch to create one. */
export function CompanyPicker({
  id,
  label = "Company",
  organizationId,
  companies,
  value,
  onChange,
}: CompanyPickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {companies.length === 0 ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">No company yet.</p>
          <AddCompanyDialog
            organizationId={organizationId}
            onCreated={(company) => onChange(company.id)}
            trigger={
              <Button type="button" variant="outline" size="sm" className="rounded-xl">
                + Add Company
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            id={id}
            className="h-9 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="" disabled>
              Select company
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.legal_name}
              </option>
            ))}
          </select>
          <AddCompanyDialog
            organizationId={organizationId}
            onCreated={(company) => onChange(company.id)}
            trigger={
              <Button type="button" variant="ghost" size="sm" className="rounded-xl">
                + Add
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
