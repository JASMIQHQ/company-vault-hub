import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileCheck2, FileWarning, XCircle, Clock3 } from "lucide-react";
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

  const tender = tenderQuery.data;
  const requirements = requirementsQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const companyDocuments = useMemo(
    () => documents.filter((document) => document.company_id === tender?.company_id),
    [documents, tender?.company_id],
  );

  if (!tenderId || !tender || requirements.length === 0) return null;

  const counts = requirements.reduce<Record<Status, number>>(
    (summary, requirement) => {
      const status = requirement.status as Status;
      if (status in STATUS_META) summary[status] += 1;
      return summary;
    },
    { matched: 0, manual_review: 0, missing: 0, expired: 0 },
  );
  const percentage = Number.isFinite(Number(tender.compliance_percentage))
    ? Math.round(Number(tender.compliance_percentage))
    : Math.round((counts.matched / requirements.length) * 100);

  const toggle = (status: Status) => setExpanded((current) => (current === status ? null : status));

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 sm:pt-6" aria-label="Tender compliance">
      <div className="glass-panel overflow-hidden rounded-2xl border border-primary/15 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tender Compliance</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-tight text-primary">{percentage}%</span>
              <span className="pb-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">Compliant</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{requirements.length} requirements · calculated from the stored requirement ledger</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(STATUS_META) as Status[]).map((status) => {
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              const active = expanded === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggle(status)}
                  className={`min-w-28 rounded-xl border px-3 py-2 text-left transition-colors ${active ? "border-primary/30 bg-primary/10" : "border-border/60 bg-background/40 hover:bg-muted/30"}`}
                  aria-expanded={active}
                >
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.className}`}><Icon className="size-3.5" />{meta.label}</span>
                  <span className="mt-1 block text-lg font-semibold text-foreground">{counts[status]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {expanded ? (
          <div className="mt-5 border-t border-border/50 pt-5">
            <button type="button" onClick={() => setExpanded(null)} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}Hide {STATUS_META[expanded].label}
            </button>
            <div className="space-y-2">
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
      </div>
    </section>
  );
}
// PR21_UPDATE_CHECK
