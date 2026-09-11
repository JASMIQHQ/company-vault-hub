import { AlertCircle, CheckCircle2, Clock3, FileWarning } from "lucide-react";

import { COMPANY_READINESS_CONDITIONAL, COMPANY_READINESS_CORE, COMPANY_READINESS_SUPPORTING } from "@/lib/company-readiness-baseline";
import { deriveCompanyReadiness } from "@/lib/company-readiness";
import { canonicalCategory } from "@/lib/document-order";
import type { CompanyDocument } from "@/lib/vault";

function normalized(value: string | null | undefined) {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function matches(document: CompanyDocument, type: string) {
  const category = canonicalCategory(document);
  if (category === type) return true;
  if (type === "AUDITED ACCT 2023") return normalized(document.document_type).includes("AUDITEDACCT") || normalized(document.document_name).includes("AUDITEDACCT");
  if (type === "DPR LICENSE") return normalized(document.document_type).includes("DPR") || normalized(document.document_name).includes("DPR");
  return false;
}

function statusFor(documents: CompanyDocument[], type: string) {
  const matchesForType = documents
    .filter((document) => matches(document, type))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const document = matchesForType[0];
  if (!document) return "Missing";
  if (document.expiry_date && document.expiry_date < new Date().toISOString().slice(0, 10)) return "Expired";
  return "Present";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Present") return <CheckCircle2 className="size-3.5" aria-hidden="true" />;
  if (status === "Expired") return <Clock3 className="size-3.5" aria-hidden="true" />;
  return <FileWarning className="size-3.5" aria-hidden="true" />;
}

function StatusList({ title, items, documents }: { title: string; items: typeof COMPANY_READINESS_SUPPORTING; documents: CompanyDocument[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const status = statusFor(documents, item.type);
          return (
            <div key={item.type} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-xs">
              <span>{item.label ?? item.type}</span>
              <span className="flex items-center gap-1 text-muted-foreground"><StatusIcon status={status} />{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyReadinessCard({ documents }: { documents: CompanyDocument[] }) {
  const engineDocuments = documents
    .map((document) => ({
      id: document.id,
      document_type: canonicalCategory(document),
      expiry_date: document.expiry_date,
      created_at: document.created_at ?? "",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const readiness = deriveCompanyReadiness({
    required: COMPANY_READINESS_CORE,
    documents: engineDocuments,
  });

  const coreStatus = (type: string) => readiness.present.includes(type) ? "Present" : readiness.expired.includes(type) ? "Expired" : "Missing";
  const scoreLabel = `${readiness.score}%`;

  return (
    <section aria-label="Company Readiness" className="glass-panel mb-6 overflow-hidden">
      <div className="border-b border-border/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Company Readiness</p>
            <h2 className="mt-1 text-lg font-semibold">Public-procurement baseline</h2>
            <p className="mt-1 text-sm text-muted-foreground">Calculated against JASMIQ's six core procurement documents. Tender-specific requirements are assessed separately.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="text-3xl font-bold tracking-tight">{scoreLabel}</div>
            <div className="text-xs text-muted-foreground">{readiness.present.length} of {readiness.total} core documents current</div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {COMPANY_READINESS_CORE.map((item) => {
            const status = coreStatus(item.type);
            return (
              <div key={item.type} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2.5 text-sm">
                <span>{item.label}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><StatusIcon status={status} />{status}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <StatusList title="Supporting Documents" items={COMPANY_READINESS_SUPPORTING} documents={documents} />
        <StatusList title="Sector-Specific / Conditional" items={COMPANY_READINESS_CONDITIONAL} documents={documents} />
      </div>

      <div className="flex items-start gap-2 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground sm:px-6">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Supporting and conditional documents are shown for visibility but do not reduce the headline readiness percentage.
      </div>
    </section>
  );
}
