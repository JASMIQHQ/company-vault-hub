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
import { StatusBadge } from "@/components/vault/status-badge";
import { createSignedUrl } from "@/hooks/use-vault";
import { formatDate, type CompanyDocument } from "@/lib/vault";

function RowActions({ document }: { document: CompanyDocument }) {
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);

  const open = async (mode: "preview" | "download") => {
    setBusy(mode);
    try {
      const url = await createSignedUrl(document.storage_path, mode === "download");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the file");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => open("preview")}
        disabled={busy !== null}
        aria-label={`Preview ${document.document_name}`}
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
        disabled={busy !== null}
        aria-label={`Download ${document.document_name}`}
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

interface DocumentListProps {
  documents: CompanyDocument[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
}

export function DocumentList({
  documents,
  isLoading,
  error,
  onRetry,
  isFiltered,
}: DocumentListProps) {
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
        <p className="text-sm font-medium text-foreground">We couldn't load your documents.</p>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" className="rounded-xl" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-14 text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
          <FileText className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {isFiltered ? "No documents match your search" : "Your vault is empty"}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isFiltered
            ? "Try a different document name or type."
            : "Upload your first company document to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Document name</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden sm:table-cell">Uploaded</TableHead>
            <TableHead className="hidden lg:table-cell">Validity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const validity = expiryState(document);
            return (
              <TableRow key={document.id} className="transition-colors">
                <TableCell className="font-medium">{document.document_name}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground capitalize">
                  {document.category?.replace(/_/g, " ") ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {document.document_type ?? "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {formatDate(document.created_at)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {validity === null ? (
                    <span className="text-muted-foreground">No expiry</span>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        validity === "expired" && "text-destructive",
                        validity === "expiring" && "text-warning",
                        validity === "valid" && "text-success",
                      )}
                    >
                      {validity === "expired"
                        ? "Expired"
                        : validity === "expiring"
                          ? "Expiring soon"
                          : "Valid"}
                      {document.expiry_date ? ` · ${formatDate(document.expiry_date)}` : ""}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={document.analysis_status} />
                </TableCell>
                <TableCell className="text-right">
                  <RowActions document={document} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

