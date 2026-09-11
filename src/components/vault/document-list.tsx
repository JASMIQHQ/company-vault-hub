import { useState } from "react";
import { CheckCircle2, Download, Eye, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
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
import { createSignedUrl, useRenameDocument, useSoftDeleteDocument } from "@/hooks/use-vault";
import { canonicalCategory } from "@/lib/document-order";
import { formatDate, type CompanyDocument } from "@/lib/vault";
import { cn } from "@/lib/utils";

function glassToast(title: string, detail?: string) {
  toast.custom(() => (
    <div className="pointer-events-auto flex w-[min(390px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-white/15 bg-background/75 p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.09] text-primary shadow-[0_0_20px_rgba(59,130,246,0.08)]">
        <CheckCircle2 className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold tracking-tight text-foreground">{title}</span>
        {detail ? <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{detail}</span> : null}
      </span>
    </div>
  ), { duration: 2600 });
}

function expiryPresentation(document: CompanyDocument) {
  if (!document.expiry_date) {
    return { label: "Never expires", tone: "emerald" as const };
  }

  const expiry = new Date(`${document.expiry_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

  if (days < 0) return { label: "Expired", tone: "red" as const };
  if (days <= 30) return { label: `Expires in ${days} ${days === 1 ? "day" : "days"}`, tone: "amber" as const };
  return { label: `Valid until ${formatDate(document.expiry_date)}`, tone: "green" as const };
}

function validityClass(tone: "emerald" | "green" | "amber" | "red") {
  if (tone === "emerald") return "border-emerald-400/15 bg-emerald-400/[0.055] text-emerald-300";
  if (tone === "green") return "border-emerald-400/12 bg-emerald-400/[0.045] text-emerald-300";
  if (tone === "amber") return "border-amber-300/15 bg-amber-300/[0.055] text-amber-200";
  return "border-red-400/15 bg-red-400/[0.055] text-red-300";
}

function typeLabel(document: CompanyDocument) {
  const type = document.document_type?.trim();
  if (type) return type;
  const category = canonicalCategory(document);
  if (category === "CAC CERTIFICATE") return "Corporate";
  return document.category?.replace(/_/g, " ") || "Corporate";
}

function RenameDialog({ document, open, onOpenChange }: { document: CompanyDocument; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState(document.document_name);
  const rename = useRenameDocument();

  const save = async () => {
    try {
      await rename.mutateAsync({ id: document.id, documentName: name });
      glassToast("Evidence label updated", "The document name has been updated in your Vault.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the document");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setName(document.document_name); }}>
      <DialogContent className="glass-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit document name</DialogTitle>
          <DialogDescription>Only the display name changes — the uploaded file stays exactly as it is.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`rename-${document.id}`}>Document name</Label>
          <Input id={`rename-${document.id}`} value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl" />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-xl" onClick={save} disabled={!name.trim() || rename.isPending}>
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
      glassToast(mode === "preview" ? "Evidence opened" : "Evidence download started", document.document_name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the file");
    } finally {
      setBusy(null);
    }
  };

  const moveToBin = async () => {
    try {
      await softDelete.mutateAsync({ id: document.id });
      glassToast("Evidence moved to Bin", "The document can be recovered from the Bin.");
      setConfirmDelete(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the document");
    }
  };

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => open("preview")} disabled={busy !== null} aria-label={`Preview ${document.document_name}`}>
        {busy === "preview" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
        <span className="ml-1.5 hidden sm:inline">Preview</span>
      </Button>
      <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => open("download")} disabled={busy !== null} aria-label={`Download ${document.document_name}`}>
        {busy === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        <span className="ml-1.5 hidden sm:inline">Download</span>
      </Button>
      <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setRenaming(true)} aria-label={`Rename ${document.document_name}`}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${document.document_name}`}>
        <Trash2 className="size-4" />
      </Button>

      <RenameDialog document={document} open={renaming} onOpenChange={setRenaming} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to move &ldquo;{document.document_name}&rdquo; to the Bin? The document will be recoverable from the Bin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={(event) => { event.preventDefault(); void moveToBin(); }} disabled={softDelete.isPending}>
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

export function DocumentList({ documents, isLoading, error, onRetry, isFiltered }: DocumentListProps) {
  if (isLoading) {
    return <div className="space-y-3 p-6">{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-12 w-full rounded-xl" />)}</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium text-foreground">We couldn't load your documents.</p>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" className="rounded-xl" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-14 text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40"><FileText className="size-5 text-muted-foreground" /></div>
        <p className="text-sm font-medium text-foreground">{isFiltered ? "No documents match your search" : "Your vault is empty"}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{isFiltered ? "Try a different document name or type." : "Upload your first company document to get started."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="h-11">Document</TableHead>
            <TableHead className="hidden h-11 md:table-cell">Type</TableHead>
            <TableHead className="h-11">Validity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const validity = expiryPresentation(document);
            return (
              <TableRow key={document.id} className="border-white/[0.055] transition-colors hover:bg-white/[0.025]">
                <TableCell className="py-3.5 align-middle">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold tracking-[-0.005em] text-foreground sm:text-sm">{document.document_name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">Uploaded {formatDate(document.created_at)}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden py-3.5 align-middle text-xs text-muted-foreground md:table-cell">{typeLabel(document)}</TableCell>
                <TableCell className="py-3.5 align-middle">
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[-0.005em]", validityClass(validity.tone))}>
                    {validity.label}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 text-right align-middle"><RowActions document={document} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
