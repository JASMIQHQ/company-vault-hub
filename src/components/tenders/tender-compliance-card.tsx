import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock3, FileCheck2, FileWarning, X, XCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useTender, useTenderRequirements } from "@/hooks/use-tenders";
import { useDocuments, useSession } from "@/hooks/use-vault";
import { formatDate } from "@/lib/vault";

const STATUS_META = {
  matched: { label: "Satisfied", icon: FileCheck2, className: "text-success" },
  manual_review: { label: "Needs Review", icon: FileWarning, className: "text-warning" },
  missing: { label: "Missing", icon: XCircle, className: "text-destructive" },
  expired: { label: "Expired", icon: Clock3, className: "text-warning" },
} as const;

type Status = keyof typeof STATUS_META;

export function TenderComplianceCard() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const tenderId = pathname.match(/^\/tenders\/([^/]+)$/)?.[1];
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const tenderQuery = useTender(session, org.activeOrgId, tenderId);
  const requirementsQuery = useTenderRequirements(session, tenderId, Boolean(tenderId));
  const documentsQuery = useDocuments(session, org.activeOrgId);
  const [expanded, setExpanded] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const tender = tenderQuery.data;
  const requirements = requirementsQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const companyDocuments = useMemo(
    () => documents.filter((document) => document.company_id === tender?.company_id),
    [documents, tender?.company_id],
  );

  const counts = useMemo(
    () => requirements.reduce<Record<Status, number>>(
      (summary, requirement) => {
        const status = requirement.status as Status;
        if (status in STATUS_META) summary[status] += 1;
        return summary;
      },
      { matched: 0, manual_review: 0, missing: 0, expired: 0 },
    ),
    [requirements],
  );

  const percentage = Number.isFinite(Number(tender?.compliance_percentage))
    ? Math.round(Number(tender?.compliance_percentage))
    : requirements.length > 0
      ? Math.round((counts.matched / requirements.length) * 100)
      : 0;

  const evidenceLinked = counts.matched + counts.manual_review;
  const analysisFingerprint = tender?.updated_at ?? tender?.analysis_status ?? "unknown";
  const storageKey = tenderId ? `jasmiq:tender-compliance:${tenderId}:${analysisFingerprint}` : null;

  useEffect(() => {
    if (!tender || requirements.length === 0 || !storageKey) return;
    const matchingStatus = tender.matching_status;
    if (matchingStatus !== "MATCHED" && matchingStatus !== "MATCHING_REVIEW") return;
    if (sessionStorage.getItem(storageKey) === "seen") return;
    setOpen(true);
  }, [requirements.length, storageKey, tender]);

  const dismiss = () => {
    if (storageKey && dontShowAgain) sessionStorage.setItem(storageKey, "seen");
    setOpen(false);
    setExpanded(null);
  };

  if (!tender || requirements.length === 0 || !open) return null;

  const toggle = (status: Status) => setExpanded((current) => (current === status ? null : status));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/45 p-4 backdrop-blur-md sm:p-6" role="presentation">
      <div className="absolute inset-0" onClick={dismiss} aria-hidden="true" />
      <section
        className="glass-panel relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-primary/20 bg-background/70 p-5 shadow-2xl shadow-primary/10 backdrop-blur-2xl sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tender-compliance-title"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full border border-border/60 bg-background/40 p-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label="Dismiss compliance summary"
        >
          <X className="size-4" />
        </button>

        <div className="pr-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tender Compliance</p>
          <h2 id="tender-compliance-title" className="mt-2 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
            {percentage}% <span className="text-base font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-lg">Compliant</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Evidence intelligence for this tender, calculated from the stored requirement ledger.</p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          {(Object.keys(STATUS_META) as Status[]).map((status) => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const active = expanded === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggle(status)}
                className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-primary/30 bg-primary/10 shadow-sm" : "border-border/60 bg-background/35 hover:bg-muted/30"}`}
                aria-expanded={active}
              >
                <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.className}`}><Icon className="size-3.5" />{meta.label}</span>
                <span className="mt-1 block text-xl font-semibold text-foreground">{counts[status]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Evidence linked:</span> <span className="font-semibold">{evidenceLinked}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-muted-foreground">Actually satisfied:</span> <span className="font-semibold">{counts.matched}</span>
        </div>

        {expanded ? (
          <div className="mt-5 rounded-2xl border border-border/50 bg-background/25 p-4">
            <button type="button" onClick={() => setExpanded(null)} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronUp className="size-3.5" />Hide {STATUS_META[expanded].label}
            </button>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {requirements.filter((requirement) => requirement.status === expanded).map((requirement) => {
                const document = companyDocuments.find((item) => item.id === requirement.matched_document_id);
                return (
                  <div key={requirement.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{requirement.requirement_name ?? requirement.requirement_text}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{requirement.explanation ?? "No explanation recorded."}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{requirement.category ?? "general"}</span>
                    </div>
                    <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                      <span className="font-medium">Evidence:</span>{" "}
                      {document ? (
                        <>{document.document_name ?? document.original_filename ?? "Company Vault document"}{document.expiry_date ? ` · expires ${formatDate(document.expiry_date)}` : " · no expiry"}</>
                      ) : (
                        "No Company Vault document matched"
                      )}
                    </div>
                  </div>
                );
              })}
              {counts[expanded] === 0 ? <p className="text-sm text-muted-foreground">No requirements in this category.</p> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} className="size-3.5 rounded border-border" />
            Don’t show again for this analysis
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={dismiss} className="rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground">
              Dismiss
            </button>
            <button type="button" onClick={() => setExpanded(expanded ?? "missing")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              View requirement breakdown
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
