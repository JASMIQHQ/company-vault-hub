import { Badge } from "@/components/ui/badge";
import type { AnalysisStatus } from "@/lib/vault";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  processing: "bg-info-soft text-info border-info/25",
  analyzed: "bg-info-soft text-info border-info/25",
  requires_review: "bg-warning-soft text-warning border-warning/25",
  verified: "bg-success-soft text-success border-success/25",
  failed: "bg-destructive/10 text-destructive border-destructive/25",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  analyzed: "Analyzed",
  requires_review: "Requires review",
  verified: "Verified",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
