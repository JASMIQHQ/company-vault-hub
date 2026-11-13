import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyDocument } from "@/lib/vault";

const MAX_VERIFICATION_BYTES = 20 * 1024 * 1024;

function isPdf(document: CompanyDocument) {
  return document.mime_type === "application/pdf" ||
    (document.original_filename ?? document.document_name).toLowerCase().endsWith(".pdf");
}

export function VerifyDocumentAction({ document }: { document: CompanyDocument }) {
  const queryClient = useQueryClient();
  const pdf = isPdf(document);
  const tooLarge = (document.file_size ?? 0) > MAX_VERIFICATION_BYTES;

  const verify = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: { document_id: document.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      return data as {
        verification_status?: "verified" | "mismatch" | "failed";
        verified_doc_type?: string | null;
        verified_year?: number | null;
        verified_expiry_date?: string | null;
        confidence?: "high" | "low";
      };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      if (result.verification_status === "verified") {
        toast.success("AI verification completed", {
          description: `Detected ${result.verified_doc_type ?? "document"} · ${result.confidence ?? "low"} confidence. Review the result before relying on it.`,
        });
      } else if (result.verification_status === "mismatch") {
        toast.warning("Document needs human review", {
          description: "The detected document type does not safely match the type on record.",
        });
      } else {
        toast.error("Verification did not complete", {
          description: "The document could not be verified. Check the file and try again.",
        });
      }
    },
    onError: (error) => {
      toast.error("Could not verify this document", {
        description: error instanceof Error ? error.message : "The verification service returned an unexpected error.",
      });
    },
  });

  if (!pdf) {
    return <span className="hidden text-[10px] text-muted-foreground xl:inline">AI verification: PDF only</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => verify.mutate()}
        disabled={verify.isPending || tooLarge}
        title={tooLarge ? "AI verification supports PDF files up to 20 MB." : "Run AI document verification"}
        aria-label={`Verify ${document.document_name} with AI`}
      >
        {verify.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileCheck2 className="size-4" />}
        <span className="ml-1.5 hidden lg:inline">{verify.isPending ? "Verifying" : document.verified_at ? "Run again" : "Verify"}</span>
      </Button>
      {tooLarge ? <span className="text-[10px] text-destructive">PDF exceeds 20 MB</span> : null}
      {document.verified_at ? <span className="text-[10px] text-muted-foreground">Last attempt {new Date(document.verified_at).toLocaleDateString()}</span> : null}
    </div>
  );
}
