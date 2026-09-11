import { useMemo } from "react";
import { CheckCircle2, Clock3, FileUp, ShieldAlert, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignRequirementLot, type TenderRequirementWithLot } from "@/hooks/use-tenders";
import type { CompanyDocument } from "@/lib/vault";
import type { TenderLot } from "@/lib/tender-lots";
import { getDocumentValidity } from "@/lib/document-validity";

function effectiveStatus(requirement: TenderRequirementWithLot, documents: CompanyDocument[]) {
  if (!requirement.matched_document_id) return requirement.status ?? "pending";
  const document = documents.find((item) => item.id === requirement.matched_document_id);
  if (document && getDocumentValidity(document.expiry_date) === "expired") return "expired";
  return requirement.status ?? "pending";
}

function actionFor(requirement: TenderRequirementWithLot, status: string) {
  if (status === "missing") return { label: "Upload document", icon: FileUp, tone: "destructive" as const };
  if (status === "expired") return { label: "Renew / upload new", icon: Clock3, tone: "warning" as const };
  if (status === "manual_review") return { label: "Review evidence", icon: ShieldAlert, tone: "warning" as const };
  if (status === "matched") return { label: "Satisfied", icon: CheckCircle2, tone: "success" as const };
  return { label: "Action required", icon: TriangleAlert, tone: "warning" as const };
}

export function TenderActionPlan({ requirements, documents, lots, selectedLotId, organizationId, tenderId }: { requirements: TenderRequirementWithLot[]; documents: CompanyDocument[]; lots: TenderLot[]; selectedLotId: string | null; organizationId: string; tenderId: string }) {
  const assignLot = useAssignRequirementLot();
  const scoped = useMemo(() => selectedLotId ? requirements.filter((item) => item.lot_id === null || item.lot_id === selectedLotId) : requirements, [requirements, selectedLotId]);
  const summary = useMemo(() => scoped.reduce((acc, requirement) => { const status = effectiveStatus(requirement, documents); if (status === "matched") acc.satisfied += 1; else if (status === "manual_review") acc.review += 1; else if (status === "expired") acc.expired += 1; else if (status === "missing") acc.missing += 1; else acc.action += 1; return acc; }, { satisfied: 0, review: 0, expired: 0, missing: 0, action: 0 }), [scoped, documents]);
  const blockers = summary.missing + summary.expired + summary.review + summary.action;
  const readiness = scoped.length > 0 && blockers === 0 ? "READY" : summary.review > 0 && summary.missing === 0 && summary.expired === 0 && summary.action === 0 ? "REVIEW_REQUIRED" : "NOT_READY";

  return <section className="glass-panel mt-5 overflow-hidden rounded-2xl">
    <div className="border-b border-border/50 p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Tender submission readiness</h2><Badge variant="outline" className={`rounded-full ${readiness === "READY" ? "border-success/25 bg-success-soft text-success" : readiness === "REVIEW_REQUIRED" ? "border-warning/25 bg-warning-soft text-warning" : "border-destructive/25 bg-destructive/5 text-destructive"}`}>{readiness === "READY" ? "READY" : readiness === "REVIEW_REQUIRED" ? "ACTION REQUIRED — REVIEW" : "NOT READY"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">This is tender/lot readiness. It does not replace Company Readiness.</p></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-success/25 bg-success-soft px-2.5 py-1 text-success">{summary.satisfied} satisfied</span>{summary.review ? <span className="rounded-full border border-warning/25 bg-warning-soft px-2.5 py-1 text-warning">{summary.review} review</span> : null}{summary.expired ? <span className="rounded-full border border-warning/25 bg-warning-soft px-2.5 py-1 text-warning">{summary.expired} expired</span> : null}{summary.missing ? <span className="rounded-full border border-destructive/25 bg-destructive/5 px-2.5 py-1 text-destructive">{summary.missing} missing</span> : null}</div></div></div>
    <div className="divide-y divide-border/50">
      {scoped.map((requirement) => { const status = effectiveStatus(requirement, documents); const action = actionFor(requirement, status); const Icon = action.icon; const linked = requirement.matched_document_id ? documents.find((document) => document.id === requirement.matched_document_id) : null; return <article key={requirement.id} className="p-5 sm:p-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="rounded-full">{requirement.category}</Badge><Badge variant="outline" className={`rounded-full ${status === "matched" ? "border-success/25 text-success" : status === "missing" || status === "expired" ? "border-destructive/25 text-destructive" : "border-warning/25 text-warning"}`}>{status.replace("_", " ")}</Badge></div><h3 className="mt-2 text-sm font-semibold">{requirement.requirement_name ?? "Unnamed requirement"}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{requirement.requirement_text}</p>{linked ? <p className="mt-2 text-xs text-muted-foreground">Evidence: <span className="font-medium text-foreground">{linked.document_name}</span>{linked.expiry_date ? ` · expires ${linked.expiry_date}` : " · no expiry"}</p> : null}</div><div className="flex shrink-0 flex-col gap-2 sm:min-w-[190px]"><Select value={requirement.lot_id ?? "tender-wide"} onValueChange={(value) => void assignLot.mutateAsync({ requirementId: requirement.id, lotId: value === "tender-wide" ? null : value })}><SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Requirement scope" /></SelectTrigger><SelectContent><SelectItem value="tender-wide">Whole tender</SelectItem>{lots.map((lot) => <SelectItem key={lot.id} value={lot.id}>Lot {lot.lot_number} — {lot.lot_title}</SelectItem>)}</SelectContent></Select><Button asChild variant={status === "matched" ? "outline" : "default"} size="sm" className="rounded-xl"><Link to="/vault"> <Icon className="mr-1.5 size-4" />{action.label}</Link></Button></div></div></article>; })}
      {scoped.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No requirements are assigned to this lot yet. Add or assign requirements to make lot readiness meaningful.</div> : null}
    </div>
    {readiness === "READY" ? <div className="border-t border-success/15 bg-success-soft/20 p-4 text-sm text-success">All scoped requirements have usable evidence. The tender/lot can move into submission packaging.</div> : <div className="border-t border-border/50 bg-muted/10 p-4 text-sm text-muted-foreground">Resolve every missing, expired, review, or unclassified item before treating this tender/lot as submit-ready.</div>}
    <div className="border-t border-border/50 p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Submission package foundation</h3><p className="mt-1 text-sm text-muted-foreground">A deterministic checklist for requirements, evidence, technical response, financial response and final review.</p></div><Badge variant="outline" className="rounded-full">G30 foundation</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Requirements ledger", "Evidence bundle", "Technical response", "Financial response"].map((item, index) => <div key={item} className="rounded-xl border border-border/60 bg-background/35 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{String(index + 1).padStart(2, "0")}</p><p className="mt-1 text-sm font-medium">{item}</p><p className="mt-1 text-xs text-muted-foreground">{index < 2 ? "Derived from stored tender evidence." : "Ready for the next controlled implementation stage."}</p></div>)}</div><p className="mt-4 text-xs text-muted-foreground">Company scope: {organizationId.slice(0, 8)} · Tender: {tenderId.slice(0, 8)}</p></div>
  </section>;
}
