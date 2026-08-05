import { useState } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermanentDeleteDocument, useRestoreDocument } from "@/hooks/use-vault";
import type { Company } from "@/hooks/use-companies";
import { formatDate, type CompanyDocument } from "@/lib/vault";

interface BinDialogProps {
  documents: CompanyDocument[];
  companies: Company[];
}

function BinRow({ document, companyName }: { document: CompanyDocument; companyName: string }) {
  const restore = useRestoreDocument();
  const purge = usePermanentDeleteDocument();
  const [confirm, setConfirm] = useState(false);

  const onRestore = async () => {
    try {
      await restore.mutateAsync({ id: document.id });
      toast.success("Document restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not restore the document");
    }
  };

  const onPurge = async () => {
    try {
      await purge.mutateAsync({ id: document.id, storagePath: document.storage_path });
      toast.success("Document permanently deleted.");
      setConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the document");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{document.document_name}</TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">{companyName}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {document.document_type ?? "—"}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatDate(document.deleted_at)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={onRestore}
            disabled={restore.isPending}
          >
            {restore.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Restore</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-destructive hover:text-destructive"
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="size-4" />
            <span className="ml-1.5 hidden sm:inline">Delete forever</span>
          </Button>
        </div>

        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent className="glass-panel">
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete document?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the document record and
                its stored file.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl"
                onClick={(event) => {
                  event.preventDefault();
                  void onPurge();
                }}
                disabled={purge.isPending}
              >
                {purge.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Permanently delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

/** Recoverable Bin for soft-deleted documents (deleted_at IS NOT NULL). */
export function BinDialog({ documents, companies }: BinDialogProps) {
  const companyName = (id: string) =>
    companies.find((company) => company.id === id)?.legal_name ?? "—";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-xl">
          <Trash2 className="mr-2 size-4" />
          Bin ({documents.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bin</DialogTitle>
          <DialogDescription>
            Deleted documents stay here until you restore or permanently delete them.
          </DialogDescription>
        </DialogHeader>
        {documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">The Bin is empty.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Document name</TableHead>
                  <TableHead className="hidden sm:table-cell">Company</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Deleted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <BinRow
                    key={document.id}
                    document={document}
                    companyName={companyName(document.company_id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
