import { useState } from "react";
import { Download, Eye, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createSignedUrl, useRenameDocument, useSoftDeleteDocument } from "@/hooks/use-vault";
import { expiryState } from "@/lib/command-center";
import { cn } from "@/lib/utils";
import { formatDate, type CompanyDocument } from "@/lib/vault";

function RenameDialog({
  document,
  open,
  onOpenChange,
}: {
  document: CompanyDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(document.document_name);
  const rename = useRenameDocument();

  const save = async () => {
    try {
      await rename.mutateAsync({ id: document.id, documentName: name });
      toast.success("Document name updated.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the document");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setName(document.document_name);
      }}
    >
      <DialogContent className="glass-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit document name</DialogTitle>
          <DialogDescription>
            Only the display name changes — the uploaded file stays exactly as it is.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`rename-${document.id}`}>Document name</Label>
          <Input
            id={`rename-${document.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            onClick={save}
            disabled={!name.trim() || rename.isPending}
          >
            {rename.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({ document }: { document: CompanyDocument }) {
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const softDelete = useSoftDeleteDocument();

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

  const moveToBin = async () => {
    try {
      await softDelete.mutateAsync({ id: document.id });
      toast.success("Document moved to Bin.");
      setConfirmDelete(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the document");
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
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => setRenaming(true)}
        aria-label={`Rename ${document.document_name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg text-destructive hover:text-destructive"
        onClick={() => setConfirmDelete(true)}
        aria-label={`Delete ${document.document_name}`}
      >
        <Trash2 className="size-4" />
      </Button>

      <RenameDialog document={document} open={renaming} onOpenChange={setRenaming} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move &ldquo;{document.document_name}&rdquo; to the Bin? The
              document will be recoverable from the Bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={(event) => {
                event.preventDefault();
                void moveToBin();
              }}
              disabled={softDelete.isPending}
            >
              {softDelete.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Move to Bin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

