import { useState, type ChangeEvent } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadTender } from "@/hooks/use-tenders";
import { TENDER_ACCEPT_ATTRIBUTE, validateTenderFile } from "@/lib/tenders";

export function TenderUploadDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const upload = useUploadTender();

  const reset = () => {
    setFile(null);
    setTitle("");
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    const error = validateTenderFile(selected);
    if (error) {
      toast.error(error);
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  };

  const onSubmit = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({
        file,
        title: title.trim() || file.name,
        organizationId,
      });
      toast.success("Tender uploaded");
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-elegant">
          <UploadCloud className="mr-2 size-4" />
          Upload tender
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload tender</DialogTitle>
          <DialogDescription>PDF only — up to 25MB.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tender-file">File</Label>
            <Input
              id="tender-file"
              type="file"
              accept={TENDER_ACCEPT_ATTRIBUTE}
              onChange={onFileChange}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tender-title">Tender name</Label>
            <Input
              id="tender-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Supply of laboratory equipment"
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={!file || upload.isPending}
            className="rounded-xl w-full sm:w-auto"
          >
            {upload.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
