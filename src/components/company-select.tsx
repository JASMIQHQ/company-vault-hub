import { Label } from "@/components/ui/label";
import type { OrganizationOption } from "@/hooks/use-profile";

interface CompanySelectProps {
  id: string;
  label: string;
  organizations: OrganizationOption[];
  value: string | null;
  onChange: (id: string) => void;
}

/** Shared company selector — one mechanism, used by every page. */
export function CompanySelect({ id, label, organizations, value, onChange }: CompanySelectProps) {
  return (
    <div className="w-full max-w-xs">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        className="mt-1.5 h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
