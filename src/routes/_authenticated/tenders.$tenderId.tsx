import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download, Eye, FileText, Loader2, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/tenders/category-badge";
import { RequirementStatusBadge } from "@/components/tenders/requirement-status-badge";
import { StatusBadge } from "@/components/vault/status-badge";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useAnalyzeTender, useSession, useTender, useTenderRequirements, createTenderSignedUrl } from "@/hooks/use-tenders";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/tenders/$tenderId")({ component: TenderWorkspacePage });

const ANALYSIS_STATES = new Set(["pending", "processing", "analyzed", "failed", "requires_review"]);

function safeStatus(value: string | null | undefined) {
  return ANALYSIS_STATES.has(value ?? "") ? (value as "pending" | "processing" | "analyzed" | "failed" | "requires_review") : "pending";
}

function statusMessage(status: string) {
  switch (status) {
    case "processing": return "JASMIQ is processing the tender. Requirements may update when analysis completes.";
    case "analyzed": return "Requirements below are the records currently stored by the tender analysis pipeline.";
    case "requires_review": return "Analysis completed with items that require human review before they should be trusted.";
    case "failed": return "The last analysis did not complete successfully. No new requirements are invented by this workspace.";
    default: return "This tender has not completed analysis yet.";
  }
}

function TenderWorkspacePage() {
  const { tenderId } = Route.useParams();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const tenderQuery = useTender(session, org.activeOrgId, tenderId);
  const requirementsQuery = useTenderRequirements(session, tenderId, safeStatus(tenderQuery.data?.analysis_status) !== "pending");
  const analyze = useAnalyzeTender();
  const [search, setSearch] = useState("");
  const [busyFile, setBusyFile] = useState<"preview" | "download" | null>(null);

  const requirements = requirementsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requirements;
    return requirements.filter((item) => `${item.requirement_name ?? ""} ${item.requirement_text} ${item.category}`.toLowerCase().includes(term));
  }, [requirements, search]);

  if (sessionLoading || org.bootstrapping || tenderQuery.isPending) return <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-12"><Skeleton className="h-8 w-2/3 rounded-xl" /><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  if (tenderQuery.error) return <WorkspaceMessage title="Unable to load tender" message={(tenderQuery.error as Error).message} />;
  const tender = tenderQuery.data;
  if (!tender) return <WorkspaceMessage title="Tender not found" message="This tender is not available in your active organization." />;

  const status = safeStatus(tender.analysis_status);
  const matchedCount = requirements.filter((r) => Boolean(r.matched_document_id)).length;
  const missingEvidenceCount = requirements.length - matchedCount;

  const analyzeNow = async () => {
    if (analyze.isPending) return;
    try {
      await analyze.mutateAsync(tender.id);
      await Promise.all([tenderQuery.refetch(), requirementsQuery.refetch()]);
      toast.success("Tender analysis refreshed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tender analysis failed");
      await tenderQuery.refetch();
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
    } finally { setBusyFile(null); }
  };

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-5"><Link to="/tenders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Tender Command</Link></div>
    <header className="glass-panel overflow-hidden rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="rounded-full">Tender workspace</Badge><StatusBadge status={status} /></div><h1 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{tender.title}</h1><div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3"><div><span className="block text-xs uppercase tracking-wide">Procuring entity</span><span className="font-medium text-foreground">{tender.procuring_entity ?? "Not recorded"}</span></div><div><span className="block text-xs uppercase tracking-wide">Submission deadline</span><span className="font-medium text-foreground">{tender.submission_deadline ? formatDate(tender.submission_deadline) : "Not recorded"}</span></div><div><span className="block text-xs uppercase tracking-wide">Uploaded</span><span className="font-medium text-foreground">{tender.created_at ? formatDate(tender.created_at) : "Not recorded"}</span></div></div></div>
        <div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" className="rounded-xl" onClick={() => openTenderFile("preview")} disabled={!tender.storage_path || busyFile !== null}>{busyFile === "preview" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}<span className="ml-2">Preview</span></Button><Button variant="outline" className="rounded-xl" onClick={() => openTenderFile("download")} disabled={!tender.storage_path || busyFile !== null}>{busyFile === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}<span className="ml-2">Download</span></Button><Button className="rounded-xl" onClick={analyzeNow} disabled={analyze.isPending || status === "processing"}>{analyze.isPending || status === "processing" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}<span className="ml-2">{status === "analyzed" || status === "requires_review" ? "Re-analyze" : "Analyze"}</span></Button></div>
      </div>
      <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">{statusMessage(status)}</div>
      {status === "failed" && tender.analysis_error ? <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><strong>Analysis error:</strong> {tender.analysis_error}</div> : null}
    </header>

    <section className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Extracted requirements" value={String(requirements.length)} /><Metric label="Evidence links" value={String(matchedCount)} /><Metric label="No evidence linked" value={String(missingEvidenceCount)} /></section>

    <section className="glass-panel mt-5 overflow-hidden rounded-2xl">
      <div className="border-b border-border/50 p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Extracted requirements</h2><p className="mt-1 text-sm text-muted-foreground">Read-only view of what the current analysis stored. This page does not create matches or recommendations.</p></div><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements" className="rounded-xl pl-9" aria-label="Search extracted requirements" /></div></div></div>
      {status === "pending" ? <div className="p-10 text-center"><FileText className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Analysis has not produced a checklist yet.</p><p className="mt-1 text-sm text-muted-foreground">Use Analyze to invoke the existing tender analysis pipeline.</p></div> : requirementsQuery.isPending ? <div className="space-y-3 p-5"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div> : requirementsQuery.error ? <div className="p-10 text-center text-sm text-destructive">{(requirementsQuery.error as Error).message}</div> : filtered.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-medium">{requirements.length === 0 ? "No requirements are currently stored." : "No requirements match this search."}</p><p className="mt-1 text-sm text-muted-foreground">{requirements.length === 0 ? "This is an honest empty state; the workspace will not invent requirements." : "Try another search term."}</p></div> : <div className="divide-y divide-border/50">{filtered.map((requirement) => <RequirementRow key={requirement.id} requirement={requirement} />)}</div>}
    </section>

    <section className="mt-5 rounded-2xl border border-info/20 bg-info-soft/40 p-4 text-sm text-muted-foreground"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" /><div><p className="font-medium text-foreground">Evidence is descriptive, not a recommendation.</p><p className="mt-1">A document is only shown as linked evidence when the backend has actually populated <code className="rounded bg-background/60 px-1">matched_document_id</code>. The workspace does not infer qualification from a score.</p></div></div></section>
  </div>;
}

function RequirementRow({ requirement }: { requirement: { id: string; category: string; requirement_name: string | null; requirement_text: string; status: string | null; confidence_score: number | null; explanation: string | null; matched_document_id: string | null } }) {
  return <article className="p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><RequirementStatusBadge status={requirement.status} /><CategoryBadge category={requirement.category} />{requirement.matched_document_id ? <Badge variant="outline" className="rounded-full border-success/25 bg-success-soft text-success">Evidence linked</Badge> : <Badge variant="outline" className="rounded-full">No evidence linked</Badge>}</div><h3 className="mt-3 text-sm font-semibold">{requirement.requirement_name ?? "Unnamed requirement"}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{requirement.requirement_text}</p>{requirement.explanation ? <p className="mt-3 border-l-2 border-border pl-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Analysis explanation:</span> {requirement.explanation}</p> : null}{typeof requirement.confidence_score === "number" ? <p className="mt-2 text-xs text-muted-foreground">Stored confidence: {Math.round(requirement.confidence_score * 100)}%</p> : null}{requirement.matched_document_id ? <EvidenceReference documentId={requirement.matched_document_id} /> : null}</article>;
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
  return <div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="rounded-lg" onClick={open} disabled={state === "loading"}>{state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}<span className="ml-1.5">Open linked Vault evidence</span></Button><span className="text-[11px] text-muted-foreground">Existing backend link: {documentId.slice(0, 8)}…</span></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="glass-panel rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p></div>; }
function WorkspaceMessage({ title, message }: { title: string; message: string }) { return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><TriangleAlert className="mx-auto size-8 text-warning" /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link to="/tenders">Back to Tenders</Link></Button></div>; }
