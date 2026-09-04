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
import { StatusBadge } from "@/components/vault/status-badge";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { createTenderSignedUrl, useAnalyzeTender, useTender, useTenderRequirements } from "@/hooks/use-tenders";
import { useSession } from "@/hooks/use-vault";
import { supabase } from "@/integrations/supabase/client";
import { deriveRequirementGuidance } from "@/lib/requirement-diagnostics";
import { deriveTenderReadiness, type TenderReadiness } from "@/lib/tender-readiness";
import type { TenderRequirementItem } from "@/lib/tenders";
import { parseAnalysisJson } from "@/lib/tender-analysis";
import { formatDate } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/tenders/$tenderId")({ component: TenderWorkspacePage });

const ANALYSIS_STATES = new Set(["pending", "processing", "analyzed", "failed", "requires_review"]);
type AnalysisStatus = "pending" | "processing" | "analyzed" | "failed" | "requires_review";

type MatchingStatus = "MATCHING" | "MATCHED" | "MATCHING_REVIEW" | "MATCHING_FAILED";

function safeStatus(value: string | null | undefined): AnalysisStatus {
  return ANALYSIS_STATES.has(value ?? "") ? value as AnalysisStatus : "pending";
}

function safeMatchingStatus(value: string | null | undefined): MatchingStatus | null {
  return value === "MATCHING" || value === "MATCHED" || value === "MATCHING_REVIEW" || value === "MATCHING_FAILED"
    ? value
    : null;
}

function statusMessage(status: AnalysisStatus) {
  switch (status) {
    case "processing": return "JASMIQ is processing the tender. Requirements may update when analysis completes.";
    case "analyzed": return "Showing the requirements and metadata currently stored by the analysis pipeline.";
    case "requires_review": return "Analysis completed, but some results require human review before they should be trusted.";
    case "failed": return "The last analysis did not complete successfully. This workspace will not invent replacement requirements.";
    default: return "This tender has not completed analysis yet.";
  }
}

function analysisLabel(status: AnalysisStatus) {
  switch (status) {
    case "processing": return "Processing";
    case "analyzed": return "Analyzed";
    case "failed": return "Failed";
    case "requires_review": return "Review Required";
    default: return "Pending";
  }
}

function matchingLabel(status: MatchingStatus | null) {
  switch (status) {
    case "MATCHING": return "Matching";
    case "MATCHED": return "Matched";
    case "MATCHING_REVIEW": return "Review Required";
    case "MATCHING_FAILED": return "Failed";
    default: return "Not Started";
  }
}

function readinessLabel(readiness: TenderReadiness) {
  switch (readiness) {
    case "READY": return "Ready";
    case "REVIEW_REQUIRED": return "Review Required";
    default: return "Not Ready";
  }
}

function signalClass(kind: "analysis" | "matching" | "readiness", value: string) {
  if (kind === "readiness") {
    if (value === "READY") return "border-success/25 bg-success-soft text-success";
    if (value === "REVIEW_REQUIRED") return "border-warning/25 bg-warning-soft text-warning";
    return "border-destructive/25 bg-destructive/5 text-destructive";
  }
  if (value === "analyzed" || value === "MATCHED") return "border-success/25 bg-success-soft text-success";
  if (value === "processing" || value === "MATCHING" || value === "MATCHING_REVIEW" || value === "requires_review") return "border-warning/25 bg-warning-soft text-warning";
  if (value === "failed" || value === "MATCHING_FAILED") return "border-destructive/25 bg-destructive/5 text-destructive";
  return "border-border/60 bg-muted/20 text-muted-foreground";
}

function TenderWorkspacePage() {
  const { tenderId } = Route.useParams();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const tenderQuery = useTender(session, org.activeOrgId, tenderId);
  const status = safeStatus(tenderQuery.data?.analysis_status);
  const matchingStatus = safeMatchingStatus(tenderQuery.data?.matching_status);
  const requirementsQuery = useTenderRequirements(session, tenderId, status !== "pending");
  const analyze = useAnalyzeTender();
  const [search, setSearch] = useState("");
  const [busyFile, setBusyFile] = useState<"preview" | "download" | null>(null);

  const requirements = requirementsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requirements;
    return requirements.filter((item) => `${item.requirement_name ?? ""} ${item.requirement_text} ${item.category}`.toLowerCase().includes(term));
  }, [requirements, search]);

  if (sessionLoading || org.bootstrapping || tenderQuery.isPending) {
    return <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-12"><Skeleton className="h-8 w-2/3 rounded-xl" /><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-72 w-full rounded-2xl" /></div>;
  }
  if (tenderQuery.error) return <WorkspaceMessage title="Unable to load tender" message={(tenderQuery.error as Error).message} />;
  const tender = tenderQuery.data;
  if (!tender) return <WorkspaceMessage title="Tender not found" message="This tender is not available in your active organization." />;

  const counts = requirements.reduce((summary, requirement) => {
    switch (requirement.status) {
      case "matched": summary.matched += 1; break;
      case "manual_review": summary.manualReview += 1; break;
      case "missing": summary.missing += 1; break;
      case "expired": summary.expired += 1; break;
    }
    return summary;
  }, { matched: 0, manualReview: 0, missing: 0, expired: 0 });
  const readiness = deriveTenderReadiness(requirements);
  const analysis = parseAnalysisJson(tender.analysis_json);
  const categoryCounts = requirements.reduce<Record<string, number>>((counts, requirement) => {
    const key = requirement.category || "general";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const analyzeNow = async () => {
    if (analyze.isPending || status === "processing") return;
    try {
      await analyze.mutateAsync(tender.id);
      await Promise.all([tenderQuery.refetch(), requirementsQuery.refetch()]);
      toast.success("Tender analysis refreshed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tender analysis failed");
      await Promise.all([tenderQuery.refetch(), requirementsQuery.refetch()]);
    }
  };

  const openTenderFile = async (mode: "preview" | "download") => {
    if (!tender.storage_path) return;
    setBusyFile(mode);
    try {
      const url = await createTenderSignedUrl(tender.storage_path, mode === "download");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open tender file");
    } finally {
      setBusyFile(null);
    }
  };

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-5"><Link to="/tenders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Tender Command</Link></div>

    <header className="glass-panel overflow-hidden rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">Tender workspace</Badge>
            <StatusBadge status={status} />
          </div>
          <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{tender.title}</h1>
          <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <Snapshot label="Procuring entity" value={tender.procuring_entity} />
            <Snapshot label="Submission deadline" value={tender.submission_deadline ? formatDate(tender.submission_deadline) : null} />
            <Snapshot label="Uploaded" value={tender.created_at ? formatDate(tender.created_at) : null} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => openTenderFile("preview")} disabled={!tender.storage_path || busyFile !== null}>{busyFile === "preview" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}<span className="ml-2">Preview</span></Button>
          <Button variant="outline" className="rounded-xl" onClick={() => openTenderFile("download")} disabled={!tender.storage_path || busyFile !== null}>{busyFile === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}<span className="ml-2">Download</span></Button>
          <Button className="rounded-xl" onClick={analyzeNow} disabled={analyze.isPending || status === "processing"}>{analyze.isPending || status === "processing" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}<span className="ml-2">{status === "analyzed" || status === "requires_review" ? "Re-analyze" : "Analyze"}</span></Button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <StateSignal label="Analysis" value={analysisLabel(status)} className={signalClass("analysis", status)} />
        <StateSignal label="Matching" value={matchingLabel(matchingStatus)} className={signalClass("matching", matchingStatus ?? "")} />
        <StateSignal label="Readiness" value={readinessLabel(readiness)} className={signalClass("readiness", readiness)} />
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">{statusMessage(status)}</div>
      {matchingStatus === "MATCHING" ? <div className="mt-3 rounded-xl border border-warning/25 bg-warning-soft/30 p-3 text-sm text-warning">Evidence matching in progress…</div> : null}
      {matchingStatus === "MATCHING_REVIEW" ? <div className="mt-3 rounded-xl border border-warning/25 bg-warning-soft/30 p-3 text-sm text-warning">Matching complete — some requirements need review</div> : null}
      {matchingStatus === "MATCHING_FAILED" ? <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">Analysis succeeded, but evidence matching failed</div> : null}
      {status === "failed" && tender.analysis_error ? <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><strong>Analysis error:</strong> {tender.analysis_error}</div> : null}
    </header>

    <section className="glass-panel mt-5 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-medium">{requirements.length} Requirements</span>
        <CountSignal symbol="✓" label="Matched" value={counts.matched} className="text-success" />
        <CountSignal symbol="⚠" label="Manual Review" value={counts.manualReview} className="text-warning" />
        <CountSignal symbol="✕" label="Missing" value={counts.missing} className="text-destructive" />
        <CountSignal symbol="⏱" label="Expired" value={counts.expired} className="text-warning" />
      </div>
    </section>

    {status === "analyzed" || status === "requires_review" ? <section className="glass-panel mt-5 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><h2 className="text-lg font-semibold">Tender intelligence snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Only facts already stored by the existing analysis pipeline are displayed here.</p></div>
        <div className="flex flex-wrap gap-2">{tender.lot_number ? <Badge variant="outline" className="rounded-full">Lot {tender.lot_number}</Badge> : null}{tender.industry ? <Badge variant="outline" className="rounded-full">{tender.industry}</Badge> : null}</div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Snapshot label="Reference number" value={tender.reference_number} />
        <Snapshot label="Procurement method" value={tender.procurement_method} />
        <Snapshot label="Tender type" value={tender.tender_type} />
        <Snapshot label="Opening date" value={tender.opening_date ? formatDate(tender.opening_date) : null} />
        <Snapshot label="Lot description" value={tender.lot_description} />
        <Snapshot label="Bid security" value={booleanText(tender.requires_bid_security)} />
        <Snapshot label="Bank reference" value={booleanText(tender.requires_bank_reference)} />
        <Snapshot label="Affidavit" value={booleanText(tender.requires_affidavit)} />
        <Snapshot label="Requirement categories" value={Object.entries(categoryCounts).map(([key, count]) => `${key}: ${count}`).join(" · ") || null} />
      </div>
      {analysis.hasData ? <div className="mt-5 border-t border-border/50 pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stored analysis fields</p><div className="mt-3 flex flex-wrap gap-2">{analysis.metrics.map((metric) => <div key={`${metric.label}-${metric.value}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs"><span className="text-muted-foreground">{metric.label}:</span> <span className="font-medium">{metric.value}</span></div>)}</div>{analysis.rawSummary ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{analysis.rawSummary}</p> : null}</div> : null}
    </section> : null}

    <section className="glass-panel mt-5 overflow-hidden rounded-2xl">
      <div className="border-b border-border/50 p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Extracted requirements</h2><p className="mt-1 text-sm text-muted-foreground">Read-only records from the analysis pipeline. No new matches or recommendations are created here.</p></div><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements" className="rounded-xl pl-9" aria-label="Search extracted requirements" /></div></div></div>
      {status === "pending" ? <EmptyState title="Analysis has not produced a checklist yet." message="Use Analyze to invoke the existing tender analysis pipeline." /> : requirementsQuery.isPending ? <div className="space-y-3 p-5"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div> : requirementsQuery.error ? <div className="p-10 text-center text-sm text-destructive">{(requirementsQuery.error as Error).message}</div> : filtered.length === 0 ? <EmptyState title={requirements.length === 0 ? "No requirements are currently stored." : "No requirements match this search."} message={requirements.length === 0 ? "This is an honest empty state; the workspace will not invent requirements." : "Try another search term."} /> : <div className="divide-y divide-border/50">{filtered.map((requirement) => <RequirementRow key={requirement.id} requirement={requirement} />)}</div>}
    </section>

    <section className="mt-5 rounded-2xl border border-info/20 bg-info-soft/40 p-4 text-sm text-muted-foreground"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" /><div><p className="font-medium text-foreground">Evidence is descriptive, not a recommendation.</p><p className="mt-1">A document is only shown as linked evidence when the backend has populated <code className="rounded bg-background/60 px-1">matched_document_id</code>.</p></div></div></section>
  </div>;
}

function StateSignal({ label, value, className }: { label: string; value: string; className: string }) {
  return <div className={`rounded-xl border px-3 py-2.5 ${className}`}><p className="text-[10px] font-medium uppercase tracking-wide opacity-75">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div>;
}

function CountSignal({ symbol, label, value, className }: { symbol: string; label: string; value: number; className: string }) {
  return <span className={`inline-flex items-center gap-1 ${className}`}><span aria-hidden="true">{symbol}</span><span className="font-semibold">{value}</span><span className="text-muted-foreground">{label}</span></span>;
}

function RequirementRow({ requirement }: { requirement: TenderRequirementItem }) {
  const guidance = deriveRequirementGuidance(requirement.status, requirement.explanation);

  return <article className="p-5 sm:p-6">
    <div className="flex flex-wrap items-center gap-2">
      <RequirementStatusBadge status={requirement.status} />
      <CategoryBadge category={requirement.category} />
      {requirement.matched_document_id ? <Badge variant="outline" className="rounded-full border-success/25 bg-success-soft text-success">Evidence linked</Badge> : <Badge variant="outline" className="rounded-full">No evidence linked</Badge>}
    </div>
    <h3 className="mt-3 text-sm font-semibold">{requirement.requirement_name ?? "Unnamed requirement"}</h3>
    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{requirement.requirement_text}</p>

    <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <p className="text-sm font-semibold text-foreground">{guidance.headline}</p>
      {guidance.explanation ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{guidance.explanation}</p> : null}
      {guidance.action ? <p className="mt-2 text-sm font-medium text-primary">→ {guidance.action}</p> : null}
    </div>

    {requirement.matched_document_id ? <EvidenceReference documentId={requirement.matched_document_id} /> : null}
  </article>;
}

function EvidenceReference({ documentId }: { documentId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "missing">("idle");
  const [documentName, setDocumentName] = useState<string | null>(null);
  const open = async () => {
    setState("loading");
    try {
      const { data, error } = await supabase.from("company_documents").select("id, document_name, original_filename, storage_path").eq("id", documentId).is("deleted_at", null).maybeSingle();
      if (error) throw error;
      if (!data?.storage_path) { setState("missing"); return; }
      setDocumentName(data.document_name ?? data.original_filename ?? "Vault evidence");
      const { data: signed, error: signedError } = await supabase.storage.from("company-documents").createSignedUrl(data.storage_path, 60);
      if (signedError) throw signedError;
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
      setState("idle");
    } catch { setState("missing"); }
  };
  if (state === "missing") return <div className="mt-3 flex items-center gap-2 text-xs text-warning"><TriangleAlert className="size-4" />Evidence is no longer available to this user.</div>;
  return <div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="rounded-lg" onClick={open} disabled={state === "loading"}>{state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}<span className="ml-1.5">{documentName ? `Open ${documentName}` : "Open linked Vault evidence"}</span></Button></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="glass-panel rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight capitalize">{value}</p></div>; }
function Snapshot({ label, value }: { label: string; value: string | null }) { return <div className="rounded-xl border border-border/60 bg-muted/10 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || "Not recorded"}</p></div>; }
function booleanText(value: boolean | null) { return value === true ? "Required" : value === false ? "Not stated as required" : "Not recorded"; }
function EmptyState({ title, message }: { title: string; message: string }) { return <div className="p-10 text-center"><FileText className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></div>; }
function WorkspaceMessage({ title, message }: { title: string; message: string }) { return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><TriangleAlert className="mx-auto size-8 text-warning" /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link to="/tenders">Back to Tenders</Link></Button></div>; }
