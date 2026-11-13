import { FileCheck2 } from "lucide-react";

import { VerifyDocumentAction } from "@/components/vault/verify-document-action";
import type { CompanyDocument } from "@/lib/vault";

function isPdf(document: CompanyDocument) {
  return (
    document.mime_type === "application/pdf" ||
    (document.original_filename ?? document.document_name).toLowerCase().endsWith(".pdf")
  );
}

export function VerificationQueue({ documents }: { documents: CompanyDocument[] }) {
  const pdfs = documents.filter(isPdf);

  if (pdfs.length === 0) return null;

  return (
    <section className="relative z-10 mt-6 rounded-[1.75rem] border border-primary/15 bg-primary/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:bg-primary/[0.025] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.08] text-primary">
            <FileCheck2 className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">AI document verification</h2>
            <p className="text-xs text-muted-foreground">
              Run a document check on a PDF. AI results are not a substitute for human approval.
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {pdfs.length} PDF {pdfs.length === 1 ? "document" : "documents"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {pdfs.map((document) => (
          <div
            key={document.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/45 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{document.document_name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {document.document_type || document.category.replace(/_/g, " ")}
              </p>
            </div>
            <VerifyDocumentAction document={document} />
          </div>
        ))}
      </div>
    </section>
  );
}
