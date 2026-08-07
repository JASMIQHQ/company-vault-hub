import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { effectiveStatus, type BankReferenceListItem } from "@/lib/bank-references";

const STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  REQUESTED: "bg-info-soft text-info border-info/25",
  PROCESSING: "bg-warning-soft text-warning border-warning/25",
  RECEIVED: "bg-success-soft text-success border-success/25",
  EXPIRED: "bg-destructive/10 text-destructive border-destructive/25",
  TEMPLATE: "bg-muted text-muted-foreground border-border",
};

export function BankReferenceStatusBadge({ item }: { item: BankReferenceListItem }) {
  const status = effectiveStatus(item);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
