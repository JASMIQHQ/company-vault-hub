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
import type { TenderRequirementItem } from "@/lib/tenders";
import { parseAnalysisJson } from "@/lib/tender-analysis";
import { formatDate } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/tenders/$tenderId")({ component: TenderWorkspacePage });

const ANALYSIS_STATES = new Set(["pending", "processing", "analyzed", "failed", "requires_review"]);
type AnalysisStatus = "pending" | "processing" | "analyzed" | "failed" | "requires_review";

function safeStatus(value: string | null | undefined): AnalysisStatus {
  return ANALYSIS_STATES.has(value ?? "") ? value as AnalysisStatus : "pending";
}

function statusMessage(status: AnalysisStatus) {
  switch (status) {
    case "processing": return "JASMIQ is processing the tender. Requirements may update when analysis completes.";
    case "analyzed": return "JASMIQ has checked the tender requirements against the selected company's Vault.";
    case "requires_review": return "JASMIQ found items that need human confirmation before the bid can be trusted.";
    case "failed": return "The last analysis did not complete successfully. This workspace will not invent replacement requirements.";
    default: return "This tender has not completed analysis yet.";
  }
}

function TenderWorkspacePage() {
  const { tenderId } = Route.useParams();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const tenderQuery = useTender(session, org.activeOrgId, tenderId);
  const status = safeStatus(tenderQuery.data?.analysis_status);
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

  const satisfiedCount = requirements.filter((r) => r.status === "matched").length;
  const reviewCount = requirements.filter((r) => r.status === "manual_review" || r.status === "pending").length;
  const expiredCount = requirements.filter((r) => r.status === "expired").length;
  const missingCount = requirements.filter((r) => r.status === "missing").length;
  const readinessScore = requirements.length ? Math.round(((satisfiedCount + reviewCount * 0.5) / requirements.length) * 100) : 0;
  const mandatoryBlockedCount = requirements.filter((r) => r.category === "mandatory" && r.status !== "matched").length;
  const bidReadyLabel = mandatoryBlockedCount > 0 ? "Eligibility blocked" : readinessScore >= 80 ? "Bid ready" : readinessScore >= 50 ? "Needs attention" : "Action required";
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
      toast.success("Tender analysis and Vault evidence matching refreshed");
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
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="rounded-full">Tender workspace</Badge><StatusBadge status={status} /></div>
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
      <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">{statusMessage(status)}</div>
      {status === "failed" && tender.analysis_error ? <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><strong>Analysis error:</strong> {tender.analysis_error}</div> : null}
    </header>

    <section className="glass-panel mt-5 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold capitalize">{bidReadyLabel}</h2><Badge variant="outline" className="rounded-full">{readinessScore}%</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{satisfiedCount} of {requirements.length} requirements are fully covered.</p>
        </div>
        {mandatoryBlockedCount > 0 ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm"><span className="font-semibold">{mandatoryBlockedCount} mandatory item{mandatoryBlockedCount === 1 ? "" : "s"} need attention.</span><span className="ml-1 text-muted-foreground">Fix these before treating the bid as eligible.</span></div> : null}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(readinessScore, 100)}%` }} /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReadinessItem label="Ready" value={satisfiedCount} /><ReadinessItem label="Review" value={reviewCount} /><ReadinessItem label="Missing" value={missingCount} /><ReadinessItem label="Expired" value={expiredCount} /></div>
    </section>

    {status === "analyzed" || status === "requires_review" ? <section className="glass-panel mt-5 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><h2 className="text-lg font-semibold">Tender snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Key facts at a glance. Open the tender file for the full document.</p></div>
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
      {analysis.hasData ? <details className="mt-5 border-t border-border/50 pt-5"><summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">View stored analysis details</summary><div className="mt-3 flex flex-wrap gap-2">{analysis.metrics.map((metric) => <div key={`${metric.label}-${metric.value}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs"><span className="text-muted-foreground">{metric.label}:</span> <span className="font-medium">{metric.value}</span></div>)}</div>{analysis.rawSummary ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{analysis.rawSummary}</p> : null}</details> : null}
    </section> : null}

    <section className="glass-panel mt-5 overflow-hidden rounded-2xl">
      <div className="border-b border-border/50 p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">What needs attention</h2><p className="mt-1 text-sm text-muted-foreground">JASMIQ checked the selected company's Vault. Click a requirement for details.</p></div><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements" className="rounded-xl pl-9" aria-label="Search requirements" /></div></div></div>
      {status === "pending" ? <EmptyState title="Analysis has not produced a checklist yet." message="Use Analyze to invoke the existing tender analysis pipeline." /> : requirementsQuery.isPending ? <div className="space-y-3 p-5"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div> : requirementsQuery.error ? <div className="p-10 text-center text-sm text-destructive">{(requirementsQuery.error as Error).message}</div> : filtered.length === 0 ? <EmptyState title={requirements.length === 0 ? "No requirements are currently stored." : "No requirements match this search."} message={requirements.length === 0 ? "This is an honest empty state; the workspace will not invent requirements." : "Try another search term."} /> : <div className="divide-y divide-border/50">{filtered.map((requirement) => <RequirementRow key={requirement.id} requirement={requirement} />)}</div>}
    </section>

    <section className="mt-5 rounded-2xl border border-info/20 bg-info-soft/40 p-4 text-sm text-muted-foreground"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" /><div><p className="font-medium text-foreground">JASMIQ evidence check</p><p className="mt-1">Matches are evidence signals, not a legal opinion. Review flagged items before submission.</p></div></div></section>
  </div>;
}

function RequirementRow({ requirement }: { requirement: TenderRequirementItem }) {
  const summary = requirement.status === "matched"
    ? `Covered by ${requirement.matched_document_id ? "a Vault document" : "verified evidence"}.`
    : requirement.status === "manual_review"
      ? "Potential evidence found — review required."
      : requirement.status === "expired"
        ? "Evidence found, but it is not valid for this tender deadline."
        : "No usable Vault evidence found.";

  return <article className="p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><RequirementStatusBadge status={requirement.status} /><CategoryBadge category={requirement.category} />{requirement.matched_document_id ? <Badge variant="outline" className="rounded-full border-success/25 bg-success-soft text-success">Evidence linked</Badge> : null}</div>
        <h3 className="mt-3 text-sm font-semibold">{requirement.requirement_name ?? "Unnamed requirement"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
      </div>
      <details className="shrink-0">
        <summary className="cursor-pointer list-none rounded-lg border border-border/60 px-3 py-2 text-xs font-medium hover:bg-muted/30">View details</summary>
        <div className="mt-3 max-w-2xl rounded-xl border border-border/60 bg-muted/10 p-4 text-sm">
          <p className="leading-6 text-muted-foreground">{requirement.requirement_text}</p>
          {requirement.explanation ? <p className="mt-3 border-l-2 border-border pl-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">JASMIQ explanation:</span> {requirement.explanation}</p> : null}
          {typeof requirement.confidence_score === "number" ? <p className="mt-2 text-xs text-muted-foreground">Match confidence: {Math.round(requirement.confidence_score * 100)}%</p> : null}
          {requirement.matched_document_id ? <EvidenceReference documentId={requirement.matched_document_id} /> : null}
        </div>
      </details>
    </div>
  </article>;
}

function EvidenceReference({ documentId }: { documentId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "missing">("idle");
  const open = async () => {
    setState("loading");
    try {
      const { data, error } = await supabase.from("company_documents").select("id, document_name, original_filename, storage_path").eq("id", documentId).is("deleted_at", null).maybeSingle();
      if (error) throw error;
      if (!data?.storage_path) { setState("missing"); return; }
      const { data: signed, error: signedError } = await supabase.storage.from("company-documents").createSignedUrl(data.storage_path, 60);
      if (signedError) throw signedError;
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
      setState("idle");
    } catch { setState("missing"); }
  };
  if (state === "missing") return <div className="mt-3 flex items-center gap-2 text-xs text-warning"><TriangleAlert className="size-4" />Evidence is no longer available to this user.</div>;
  return <div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="rounded-lg" onClick={open} disabled={state === "loading"}>{state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}<span className="ml-1.5">Open Vault evidence</span></Button></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="glass-panel rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight capitalize">{value}</p></div>; }
function ReadinessItem({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-border/60 bg-muted/10 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
function Snapshot({ label, value }: { label: string; value: string | null }) { return <div className="rounded-xl border border-border/60 bg-muted/10 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || "Not recorded"}</p></div>; }
function booleanText(value: boolean | null) { return value === true ? "Required" : value === false ? "Not stated as required" : "Not recorded"; }
function EmptyState({ title, message }: { title: string; message: string }) { return <div className="p-10 text-center"><FileText className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></div>; }
function WorkspaceMessage({ title, message }: { title: string; message: string }) { return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><TriangleAlert className="mx-auto size-8 text-warning" /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link to="/tenders">Back to Tenders</Link></Button></div>; }
