import { useState } from "react";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
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
import { createTenderSignedUrl } from "@/hooks/use-tenders";
import type { TenderListItem } from "@/lib/tenders";
import { formatDate } from "@/lib/vault";

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

interface TenderListProps {
  tenders: TenderListItem[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function TenderList({ tenders, isLoading, error, onRetry }: TenderListProps) {
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenders.map((tender) => (
            <TableRow key={tender.id} className="transition-colors">
              <TableCell className="font-medium">{tender.title}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {formatDate(tender.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <RowActions tender={tender} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
