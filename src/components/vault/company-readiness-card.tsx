import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileWarning } from "lucide-react";

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
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">Visibility only</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const status = statusFor(documents, item.type);
          return (
            <div key={item.type} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/25 px-3 py-2 text-xs">
              <span className="truncate pr-2">{item.label ?? item.type}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground"><StatusIcon status={status} />{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyReadinessCard({ documents }: { documents: CompanyDocument[] }) {
  const [showDetails, setShowDetails] = useState(false);

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
  const presentCore = readiness.present.length;
  const totalCore = readiness.total;

  return (
    <section aria-label="Company Readiness" className="glass-panel mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setShowDetails((value) => !value)}
        aria-expanded={showDetails}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-primary/[0.03] sm:p-5"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {showDetails ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">Company Readiness</span>
          <span className="mt-0.5 block truncate text-sm font-semibold">Public-procurement baseline</span>
        </span>

        <span className="hidden text-right sm:block">
          <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Core baseline</span>
          <span className="text-xs text-muted-foreground">{presentCore} of {totalCore} current</span>
        </span>

        <span className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-center">
          <span className="block text-xl font-bold leading-none tracking-tight">{readiness.score}%</span>
          <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">ready</span>
        </span>
      </button>

      {showDetails ? (
        <div className="border-t border-border/40">
          <div className="px-4 pb-4 pt-3 sm:px-5">
            <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
              JASMIQ's six universal procurement documents. Tender-specific requirements are assessed separately.
            </p>

            <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {COMPANY_READINESS_CORE.map((item) => {
                const status = coreStatus(item.type);
                return (
                  <div key={item.type} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/25 px-3 py-2 text-xs">
                    <span className="truncate pr-2">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1 text-muted-foreground"><StatusIcon status={status} />{status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 border-t border-border/40 px-4 py-4 sm:px-5">
            <StatusList title="Supporting Documents" items={COMPANY_READINESS_SUPPORTING} documents={documents} />
            <StatusList title="Sector-Specific / Conditional" items={COMPANY_READINESS_CONDITIONAL} documents={documents} />
          </div>

          <div className="flex items-start gap-2 border-t border-border/40 px-4 py-3 text-[11px] leading-4 text-muted-foreground sm:px-5">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>Supporting and conditional documents are visible for planning but do not reduce the headline readiness percentage.</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
