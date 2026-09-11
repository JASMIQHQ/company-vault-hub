import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download, Eye, FileText, Loader2, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBadge } from "@/components/tenders/category-badge";
import { RequirementStatusBadge } from "@/components/tenders/requirement-status-badge";
import { TenderComplianceCard } from "@/components/tenders/tender-compliance-card";
import { TenderLotManager, useTenderLots } from "@/components/tenders/tender-lot-manager";
import { TenderActionPlan } from "@/components/tenders/tender-action-plan";
import { StatusBadge } from "@/components/vault/status-badge";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { createTenderSignedUrl, useAnalyzeTender, useTender, useTenderRequirements } from "@/hooks/use-tenders";
import { useSession, useDocuments } from "@/hooks/use-vault";
import { deriveTenderReadiness, type TenderReadiness } from "@/lib/tender-readiness";
import { parseAnalysisJson } from "@/lib/tender-analysis";
import { formatDate } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/tenders/$tenderId")({ component: TenderWorkspacePage });

type AnalysisStatus = "pending" | "processing" | "analyzed" | "failed" | "requires_review";
type MatchingStatus = "MATCHING" | "MATCHED" | "MATCHING_REVIEW" | "MATCHING_FAILED";

function safeStatus(value: string | null | undefined): AnalysisStatus { return value === "processing" || value === "analyzed" || value === "failed" || value === "requires_review" ? value : "pending"; }
function safeMatchingStatus(value: string | null | undefined): MatchingStatus | null { return value === "MATCHING" || value === "MATCHED" || value === "MATCHING_REVIEW" || value === "MATCHING_FAILED" ? value : null; }
function readinessLabel(readiness: TenderReadiness) { return readiness === "READY" ? "Ready" : readiness === "REVIEW_REQUIRED" ? "Review Required" : "Not Ready"; }
function signalClass(kind: "readiness" | "state", value: string) { if (kind === "readiness") return value === "READY" ? "border-success/25 bg-success-soft text-success" : value === "REVIEW_REQUIRED" ? "border-warning/25 bg-warning-soft text-warning" : "border-destructive/25 bg-destructive/5 text-destructive"; if (value === "analyzed" || value === "MATCHED") return "border-success/25 bg-success-soft text-success"; if (value === "processing" || value === "MATCHING" || value === "MATCHING_REVIEW" || value === "requires_review") return "border-warning/25 bg-warning-soft text-warning"; return "border-border/60 bg-muted/20 text-muted-foreground"; }

function TenderWorkspacePage() {
  const { tenderId } = Route.useParams();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const tenderQuery = useTender(session, org.activeOrgId, tenderId);
  const status = safeStatus(tenderQuery.data?.analysis_status);
  const matchingStatus = safeMatchingStatus(tenderQuery.data?.matching_status);
  const requirementsQuery = useTenderRequirements(session, tenderId, status !== "pending");
  const documentsQuery = useDocuments(session, org.activeOrgId);
  const lotsQuery = useTenderLots(tenderId);
  const analyze = useAnalyzeTender();
  const [search, setSearch] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [busyFile, setBusyFile] = useState<"preview" | "download" | null>(null);

  const requirements = requirementsQuery.data ?? [];
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); if (!term) return requirements; return requirements.filter((item) => `${item.requirement_name ?? ""} ${item.requirement_text} ${item.category}`.toLowerCase().includes(term)); }, [requirements, search]);

  if (sessionLoading || org.bootstrapping || tenderQuery.isPending) return <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-12"><Skeleton className="h-8 w-2/3 rounded-xl" /><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-72 w-full rounded-2xl" /></div>;
  if (tenderQuery.error) return <WorkspaceMessage title="Unable to load tender" message={(tenderQuery.error as Error).message} />;
  const tender = tenderQuery.data;
  if (!tender) return <WorkspaceMessage title="Tender not found" message="This tender is not available in your active organization." />;

  const baseReadiness = deriveTenderReadiness(requirements);
  const analysis = parseAnalysisJson(tender.analysis_json);
  const counts = requirements.reduce((summary, requirement) => { if (requirement.status === "matched") summary.matched += 1; if (requirement.status === "manual_review") summary.manualReview += 1; if (requirement.status === "missing") summary.missing += 1; if (requirement.status === "expired") summary.expired += 1; return summary; }, { matched: 0, manualReview: 0, missing: 0, expired: 0 });
  const analyzeNow = async () => { if (analyze.isPending || status === "processing") return; try { await analyze.mutateAsync(tender.id); await Promise.all([tenderQuery.refetch(), requirementsQuery.refetch(), documentsQuery.refetch()]); toast.success("Tender analysis refreshed"); } catch (error) { toast.error(error instanceof Error ? error.message : "Tender analysis failed"); } };
  const openTenderFile = async (mode: "preview" | "download") => { if (!tender.storage_path) return; setBusyFile(mode); try { const url = await createTenderSignedUrl(tender.storage_path, mode === "download"); window.open(url, "_blank", "noopener,noreferrer"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not open tender file"); } finally { setBusyFile(null); } };

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-5"><Link to="/tenders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Tender Command</Link></div>
    <header className="glass-panel overflow-hidden rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="rounded-full">Tender workspace</Badge><StatusBadge status={status} /></div><h1 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{tender.title}</h1><div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3"><Snapshot label="Procuring entity" value={tender.procuring_entity} /><Snapshot label="Submission deadline" value={tender.submission_deadline ? formatDate(tender.submission_deadline) : null} /><Snapshot label="Uploaded" value={formatDate(tender.created_at)} /></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" className="rounded-xl" onClick={() => openTenderFile("preview")} disabled={!tender.storage_path || busyFile !== null}>{busyFile === "preview" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}<span className="ml-2">Preview</span></Button><Button variant="outline" className="rounded-xl" onClick={() => openTenderFile("download")} disabled={!tender.storage_path || busyFile !== null}>{busyFile === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}<span className="ml-2">Download</span></Button><Button className="rounded-xl" onClick={analyzeNow} disabled={analyze.isPending || status === "processing"}>{analyze.isPending || status === "processing" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}<span className="ml-2">{status === "analyzed" || status === "requires_review" ? "Re-analyze" : "Analyze"}</span></Button></div></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3"><StateSignal label="Analysis" value={status === "requires_review" ? "Review Required" : status} className={signalClass("state", status)} /><StateSignal label="Matching" value={matchingStatus ?? "Not Started"} className={signalClass("state", matchingStatus ?? "")} /><StateSignal label="Stored readiness" value={readinessLabel(baseReadiness)} className={signalClass("readiness", baseReadiness)} /></div>
      <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">Company Readiness is universal. Tender Readiness is scoped to this tender/lot and is recalculated below from evidence validity.</div>
      {matchingStatus === "MATCHING_REVIEW" ? <div className="mt-3 rounded-xl border border-warning/25 bg-warning-soft/30 p-3 text-sm text-warning">Matching complete — some requirements need review.</div> : null}
      {status === "failed" && tender.analysis_error ? <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><strong>Analysis error:</strong> {tender.analysis_error}</div> : null}
    </header>

    <TenderComplianceCard tender={tender} requirements={requirements} />

    <TenderLotManager tenderId={tender.id} organizationId={tender.organization_id} companyId={tender.company_id} selectedLotId={selectedLotId} onSelectLot={setSelectedLotId} />

    <TenderActionPlan requirements={requirements} documents={documentsQuery.data ?? []} lots={lotsQuery.data ?? []} selectedLotId={selectedLotId} organizationId={tender.organization_id} tenderId={tender.id} />

    <section className="glass-panel mt-5 rounded-2xl p-4 sm:p-5"><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span className="font-medium">{requirements.length} Requirements</span><span className="text-success">✓ {counts.matched} Matched</span><span className="text-warning">⚠ {counts.manualReview} Manual Review</span><span className="text-destructive">✕ {counts.missing} Missing</span><span className="text-warning">⏱ {counts.expired} Expired</span></div></section>

    {status === "analyzed" || status === "requires_review" ? <section className="glass-panel mt-5 rounded-2xl p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-lg font-semibold">Tender intelligence snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Only facts already stored by the analysis pipeline are displayed.</p></div><div className="flex flex-wrap gap-2">{tender.lot_number ? <Badge variant="outline" className="rounded-full">Lot {tender.lot_number}</Badge> : null}{tender.industry ? <Badge variant="outline" className="rounded-full">{tender.industry}</Badge> : null}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Snapshot label="Reference number" value={tender.reference_number} /><Snapshot label="Procurement method" value={tender.procurement_method} /><Snapshot label="Tender type" value={tender.tender_type} /><Snapshot label="Opening date" value={tender.opening_date ? formatDate(tender.opening_date) : null} /><Snapshot label="Lot description" value={tender.lot_description} /><Snapshot label="Bank reference" value={tender.requires_bank_reference ? "Required" : "Not stated"} /><Snapshot label="Affidavit" value={tender.requires_affidavit ? "Required" : "Not stated"} /></div>{analysis.hasData ? <div className="mt-5 border-t border-border/50 pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stored analysis fields</p><div className="mt-3 flex flex-wrap gap-2">{analysis.metrics.map((metric) => <div key={`${metric.label}-${metric.value}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs"><span className="text-muted-foreground">{metric.label}:</span> <span className="font-medium">{metric.value}</span></div>)}</div></div> : null}</section> : null}

    <section className="glass-panel mt-5 overflow-hidden rounded-2xl"><div className="border-b border-border/50 p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Requirement ledger</h2><p className="mt-1 text-sm text-muted-foreground">Filter the stored requirement ledger. Assignment and action state are managed above.</p></div><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requirements" className="rounded-xl pl-9" /></div></div></div>{status === "pending" ? <EmptyState title="Analysis has not produced a checklist yet." message="Use Analyze to invoke the existing tender analysis pipeline." /> : requirementsQuery.isPending ? <div className="space-y-3 p-5"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div> : requirementsQuery.error ? <div className="p-10 text-center text-sm text-destructive">{(requirementsQuery.error as Error).message}</div> : filtered.length === 0 ? <EmptyState title="No requirements match this search." message="Try another search term." /> : <div className="divide-y divide-border/50">{filtered.map((requirement) => <article key={requirement.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><RequirementStatusBadge status={requirement.status} /><CategoryBadge category={requirement.category} />{requirement.lot_id ? <Badge variant="outline" className="rounded-full">Lot scoped</Badge> : <Badge variant="outline" className="rounded-full">Tender-wide</Badge>}{requirement.matched_document_id ? <Badge variant="outline" className="rounded-full border-success/25 bg-success-soft text-success">Evidence linked</Badge> : null}</div><h3 className="mt-3 text-sm font-semibold">{requirement.requirement_name ?? "Unnamed requirement"}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{requirement.requirement_text}</p>{requirement.explanation ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{requirement.explanation}</p> : null}</article>)}</div>}</section>

    <section className="mt-5 rounded-2xl border border-info/20 bg-info-soft/40 p-4 text-sm text-muted-foreground"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" /><div><p className="font-medium text-foreground">Deterministic evidence spine</p><p className="mt-1">Company → Vault → Tender → Lot → Requirement → Evidence → Validity → Readiness → Action. No AI verification is invoked by G25-G30.</p></div></div></section>
  </div>;
}

function StateSignal({ label, value, className }: { label: string; value: string; className: string }) { return <div className={`rounded-xl border px-3 py-2.5 ${className}`}><p className="text-[10px] font-medium uppercase tracking-wide opacity-75">{label}</p><p className="mt-0.5 text-sm font-semibold capitalize">{value.replaceAll("_", " ")}</p></div>; }
function Snapshot({ label, value }: { label: string; value: string | null }) { return <div className="rounded-xl border border-border/60 bg-muted/10 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || "Not recorded"}</p></div>; }
function EmptyState({ title, message }: { title: string; message: string }) { return <div className="p-10 text-center"><FileText className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></div>; }
function WorkspaceMessage({ title, message }: { title: string; message: string }) { return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><TriangleAlert className="mx-auto size-8 text-warning" /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link to="/tenders">Back to Tenders</Link></Button></div>; }
