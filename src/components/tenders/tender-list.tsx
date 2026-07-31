import { Fragment, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/components/tenders/category-badge";
import { StatusBadge } from "@/components/vault/status-badge";
import {
  createTenderSignedUrl,
  useAnalyzeTender,
  useTenderRequirements,
} from "@/hooks/use-tenders";
import type { TenderListItem } from "@/lib/tenders";
import { formatDate } from "@/lib/vault";
import type { Session } from "@supabase/supabase-js";

function RowActions({ tender }: { tender: TenderListItem }) {
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);

  const open = async (mode: "preview" | "download") => {
    if (!tender.storage_path) return;
    setBusy(mode);
    try {
      const url = await createTenderSignedUrl(tender.storage_path, mode === "download");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the file");
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null || !tender.storage_path;

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => open("preview")}
        disabled={disabled}
        aria-label={`Preview ${tender.title}`}
      >
        {busy === "preview" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Eye className="size-4" />
        )}
        <span className="ml-1.5 hidden sm:inline">Preview</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => open("download")}
        disabled={disabled}
        aria-label={`Download ${tender.title}`}
      >
        {busy === "download" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        <span className="ml-1.5 hidden sm:inline">Download</span>
      </Button>
    </div>
  );
}

function AnalyzeButton({
  tender,
  onAnalyze,
}: {
  tender: TenderListItem;
  onAnalyze: (tenderId: string) => Promise<void>;
}) {
  const analyze = useAnalyzeTender();
  const status = tender.analysis_status ?? "pending";
  const processing = status === "processing" || analyze.isPending;

  const label = processing
    ? "Analyzing..."
    : status === "analyzed"
      ? "Re-analyze"
      : "Analyze";

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-lg"
      disabled={processing}
      onClick={async () => {
        try {
          await analyze.mutateAsync(tender.id);
          toast.success("Analysis started");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Analysis failed");
        }
        await onAnalyze(tender.id);
      }}
    >
      {processing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      <span className="ml-1.5">{label}</span>
    </Button>
  );
}

function RequirementChecklist({
  session,
  tender,
}: {
  session: Session | null;
  tender: TenderListItem;
}) {
  const requirements = useTenderRequirements(session, tender.id);

  if (tender.analysis_status === "failed") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Analysis failed.</p>
        {tender.analysis_error ? (
          <p className="text-sm text-muted-foreground">{tender.analysis_error}</p>
        ) : null}
      </div>
    );
  }

  if (requirements.isPending) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  if (requirements.error) {
    return (
      <p className="text-sm text-muted-foreground">
        {(requirements.error as Error).message}
      </p>
    );
  }

  if ((requirements.data ?? []).length === 0) {
    return <p className="text-sm text-muted-foreground">No requirements extracted.</p>;
  }

  return (
    <ul className="space-y-3">
      {requirements.data!.map((requirement) => (
        <li
          key={requirement.id}
          className="rounded-xl border border-border/60 bg-background/40 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={requirement.category} />
            {requirement.requirement_name ? (
              <span className="text-sm font-medium">{requirement.requirement_name}</span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {requirement.requirement_text}
          </p>
        </li>
      ))}
    </ul>
  );
}

interface TenderListProps {
  session: Session | null;
  tenders: TenderListItem[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function TenderList({
  session,
  tenders,
  isLoading,
  error,
  onRetry,
}: TenderListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium text-foreground">We couldn't load your tenders.</p>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" className="rounded-xl" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-14 text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
          <FileText className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No tenders yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Upload your first tender or RFP document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Tender name</TableHead>
            <TableHead className="hidden sm:table-cell">Uploaded</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenders.map((tender) => {
            const status = tender.analysis_status ?? "pending";
            const isOpen = expanded === tender.id;
            const showDetails = status === "analyzed" || status === "failed";

            return (
              <Fragment key={tender.id}>
                <TableRow className="transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {showDetails ? (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : tender.id)}
                          className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
                          aria-label={isOpen ? "Hide analysis" : "Show analysis"}
                        >
                          {isOpen ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      ) : (
                        <span className="inline-block size-5" />
                      )}
                      {tender.title}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDate(tender.created_at)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusBadge status={status as never} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <AnalyzeButton
                        tender={tender}
                        onAnalyze={async (id) => setExpanded(id)}
                      />
                      <RowActions tender={tender} />
                    </div>
                  </TableCell>
                </TableRow>

                {isOpen ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="bg-muted/20">
                      <div className="space-y-4 py-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Procuring Entity
                            </p>
                            <p className="text-sm font-medium">
                              {tender.procuring_entity ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Submission Deadline
                            </p>
                            <p className="text-sm font-medium">
                              {tender.submission_deadline
                                ? formatDate(tender.submission_deadline)
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-semibold tracking-tight">
                            Requirement Checklist
                          </p>
                          <RequirementChecklist session={session} tender={tender} />
                        </div>

                        {status === "failed" ? (
                          <AnalyzeButton
                            tender={tender}
                            onAnalyze={async (id) => setExpanded(id)}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
