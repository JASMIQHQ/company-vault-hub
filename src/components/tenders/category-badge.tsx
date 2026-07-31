import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  mandatory: "bg-destructive/10 text-destructive border-destructive/25",
  technical: "bg-info-soft text-info border-info/25",
  financial: "bg-success-soft text-success border-success/25",
  general: "bg-muted text-muted-foreground border-border",
};

export function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general,
      )}
    >
      {category}
    </Badge>
  );
}
