import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FileWarning, X } from "lucide-react";

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
  const present = items.filter((item) => statusFor(documents, item.type) === "Present").length;
  const expired = items.filter((item) => statusFor(documents, item.type) === "Expired").length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
        <span className="shrink-0 text-[10px] text-muted-foreground">{present}/{items.length} present{expired ? ` · ${expired} expired` : ""}</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const status = statusFor(documents, item.type);
          return (
            <div key={item.type} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <span className="min-w-0 truncate pr-2">{item.label ?? item.type}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground"><StatusIcon status={status} />{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function calculateCompanyReadiness(documents: CompanyDocument[]) {
  const engineDocuments = documents
    .map((document) => ({
      id: document.id,
      document_type: canonicalCategory(document),
      expiry_date: document.expiry_date,
      created_at: document.created_at ?? "",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return deriveCompanyReadiness({
    required: COMPANY_READINESS_CORE,
    documents: engineDocuments,
  });
}

export function CompanyReadinessCard({ documents }: { documents: CompanyDocument[] }) {
  const [showDetails, setShowDetails] = useState(false);
  const readiness = useMemo(() => calculateCompanyReadiness(documents), [documents]);
  const presentCore = readiness.present.length;
  const totalCore = readiness.total;
  const coreStatus = (type: string) => readiness.present.includes(type) ? "Present" : readiness.expired.includes(type) ? "Expired" : "Missing";
  const readinessLabel = readiness.score === 100 ? "PROCUREMENT READY" : readiness.score >= 67 ? "PROCUREMENT ATTENTION" : "BASELINE INCOMPLETE";

  useEffect(() => {
    if (!showDetails) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowDetails(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showDetails]);

  return (
    <>
      <section aria-label="Company Readiness" className="glass-panel mb-4 overflow-hidden border-white/10 bg-white/[0.035] shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="absolute inset-1 rounded-lg border border-primary/10" />
            <span className="relative size-2 rounded-full bg-primary shadow-[0_0_12px_currentColor]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{readinessLabel}</span>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">Universal procurement baseline</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{presentCore} of {totalCore} core documents current · {readiness.score}% baseline coverage</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.07] px-2.5 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:px-3">
              <span className="block text-base font-bold leading-none tracking-tight sm:text-lg">{readiness.score}%</span>
              <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">coverage</span>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-foreground/80 transition-all hover:border-primary/25 hover:bg-primary/[0.07] hover:text-foreground sm:inline-flex"
            >
              View details <span aria-hidden="true" className="ml-1 text-primary">→</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              aria-label="View company readiness details"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-all hover:border-primary/25 hover:bg-primary/[0.07] hover:text-foreground sm:hidden"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {showDetails ? (
        <div className="fixed inset-0 z-50 flex bg-black/45 backdrop-blur-[3px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowDetails(false); }}>
          <aside role="dialog" aria-modal="true" aria-label="Company Readiness details" className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-background/80 shadow-[-20px_0_60px_rgba(0,0,0,0.25)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65">
            <div className="relative overflow-hidden border-b border-white/10 px-5 pb-5 pt-6 sm:px-7">
              <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/[0.10] blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">JASMIQ Intelligence</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{readinessLabel}</h2>
                  <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Universal procurement baseline across the company's core compliance documents.</p>
                </div>
                <button type="button" onClick={() => setShowDetails(false)} aria-label="Close readiness details" className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-primary/25 hover:bg-white/[0.08] hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>

              <div className="relative mt-5 flex items-end justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Baseline coverage</p>
                  <p className="mt-1 text-sm font-medium">{presentCore} of {totalCore} core documents current</p>
                </div>
                <span className="text-3xl font-bold tracking-tight text-primary">{readiness.score}%</span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Core documents</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">These six documents determine the headline score.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{presentCore}/{totalCore}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COMPANY_READINESS_CORE.map((item) => {
                    const status = coreStatus(item.type);
                    return (
                      <div key={item.type} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <span className="min-w-0 truncate pr-2 text-xs font-medium">{item.label}</span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground"><StatusIcon status={status} />{status}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="my-6 h-px bg-white/10" />
              <div className="space-y-6">
                <StatusList title="Supporting Documents" items={COMPANY_READINESS_SUPPORTING} documents={documents} />
                <StatusList title="Sector-Specific / Conditional" items={COMPANY_READINESS_CONDITIONAL} documents={documents} />
              </div>

              <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary/[0.035] p-3.5 text-[11px] leading-5 text-muted-foreground">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Supporting and conditional documents are shown for planning. They do not reduce the headline readiness percentage; tender-specific requirements are assessed separately.</span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
