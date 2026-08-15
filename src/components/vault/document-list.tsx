import { useState } from "react";
import { Download, Eye, FileText, Loader2, Pencil, Trash2, Sparkles } from "lucide-react";
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
import { parseAnalysisJson } from "@/lib/analysis-json";
import { cn } from "@/lib/utils";
import { formatDate, formatFileSize, type CompanyDocument } from "@/lib/vault";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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

function ExperienceEvidenceDialog({ document, open, onOpenChange }: { document: CompanyDocument; open: boolean; onOpenChange: (open: boolean) => void }) {
  const parsed = parseAnalysisJson(document.analysis_json);
  const status = document.analysis_status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></div>
            <div>
              <DialogTitle>Project evidence</DialogTitle>
              <DialogDescription>{document.document_name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</p>
              <p className="mt-1 text-sm font-medium">{document.document_type || "—"}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Size</p>
              <p className="mt-1 text-sm font-medium">{formatFileSize(document.file_size)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Issue date</p>
              <p className="mt-1 text-sm font-medium">{formatDate(document.issue_date)}</p>
            </div>
          </div>

          {status === "pending" ? (
            <div className="rounded-2xl border border-border/60 bg-zinc-950/30 p-5 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Project evidence ingested</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">JASMIQ has safely vaulted this project evidence. Automatic extraction of contract values, client profiles and project scope will become available when the Intelligence Engine processes this document.</p>
            </div>
          ) : null}

          {status === "processing" ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-sm font-medium">Extracting project footprint...</p>
              <p className="mt-1 text-sm text-muted-foreground">The document is currently marked as processing.</p>
            </div>
          ) : null}

          {status === "failed" ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
              <p className="text-sm font-medium">Extraction deferred</p>
              <p className="mt-1 text-sm text-muted-foreground">The evidence remains safely vaulted. No extracted information is being inferred.</p>
            </div>
          ) : null}

          {status === "requires_review" ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-sm font-medium">Human review required</p>
              <p className="mt-1 text-sm text-muted-foreground">The current analysis state requires a human review before extracted information is treated as verified.</p>
            </div>
          ) : null}

          {status === "analyzed" && parsed.hasData ? (
            <div className="space-y-3">
              {parsed.rawSummary ? <div className="rounded-2xl border border-border/60 bg-background/30 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p><p className="mt-2 text-sm leading-6">{parsed.rawSummary}</p></div> : null}
              {parsed.metrics.length ? (
                <div className="flex flex-wrap gap-2">
                  {parsed.metrics.map((metric) => (
                    <div key={`${metric.label}-${metric.value}`} className="rounded-xl border border-border/60 bg-background/30 px-3 py-2">
                      <span className="text-[11px] text-muted-foreground">{metric.label}</span>
                      <span className="ml-2 text-sm font-medium">{metric.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {status === "analyzed" && !parsed.hasData ? (
            <div className="rounded-2xl border border-border/60 bg-background/30 p-5">
              <p className="text-sm font-medium">Analysis completed</p>
              <p className="mt-1 text-sm text-muted-foreground">No displayable structured fields were returned by the current analysis payload.</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({ document }: { document: CompanyDocument }) {
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
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
      {document.category === "Experience" ? (
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setEvidenceOpen(true)} aria-label={`View intelligence for ${document.document_name}`}>
          <Sparkles className="size-4" />
          <span className="ml-1.5 hidden xl:inline">Evidence</span>
        </Button>
      ) : null}
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

      <ExperienceEvidenceDialog document={document} open={evidenceOpen} onOpenChange={setEvidenceOpen} />
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
    return <div className="flex flex-col items-center gap-3 p-12 text-center"><p className="text-sm font-medium text-foreground">We couldn't load your documents.</p><p className="max-w-md text-sm text-muted-foreground">{error.message}</p><Button variant="outline" className="rounded-xl" onClick={onRetry}>Try again</Button></div>;
  }

  if (documents.length === 0) {
    return <div className="flex flex-col items-center gap-2 p-14 text-center"><div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40"><FileText className="size-5 text-muted-foreground" /></div><p className="text-sm font-medium text-foreground">{isFiltered ? "No documents match your search" : "Your vault is empty"}</p><p className="max-w-sm text-sm text-muted-foreground">{isFiltered ? "Try a different document name or type." : "Upload your first company document to get started."}</p></div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Document name</TableHead><TableHead className="hidden lg:table-cell">Category</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="hidden sm:table-cell">Uploaded</TableHead><TableHead className="hidden lg:table-cell">Validity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {documents.map((document) => {
            const validity = expiryState(document);
            return <TableRow key={document.id} className="transition-colors">
              <TableCell className="font-medium">{document.document_name}</TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground capitalize">{document.category?.replace(/_/g, " ") ?? "—"}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{document.document_type ?? "—"}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(document.created_at)}</TableCell>
              <TableCell className="hidden lg:table-cell">{validity === null ? <span className="text-muted-foreground">No expiry</span> : <span className={cn("text-xs font-medium", validity === "expired" && "text-destructive", validity === "expiring" && "text-warning", validity === "valid" && "text-success")}>{validity === "expired" ? "Expired" : validity === "expiring" ? "Expiring soon" : "Valid"}{document.expiry_date ? ` · ${formatDate(document.expiry_date)}` : ""}</span>}</TableCell>
              <TableCell><StatusBadge status={document.analysis_status} /></TableCell>
              <TableCell className="text-right"><RowActions document={document} /></TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>
    </div>
  );
}
