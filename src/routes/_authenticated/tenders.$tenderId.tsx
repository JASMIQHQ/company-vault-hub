import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, CircleAlert, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/tenders/category-badge";
import { RequirementStatusBadge } from "@/components/tenders/requirement-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useAnalyzeTender, useSession, useTender, useTenderRequirements } from "@/hooks/use-tenders";
import { formatDate } from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/tenders/$tenderId")({
  head: () => ({
    meta: [
      { title: "Tender Workspace | Jasmiq Procurement AI" },
      {
        name: "description",
        content: "Tender Intelligence Workspace for requirements, readiness and evidence review.",
      },
    ],
  }),
  component: TenderWorkspacePage,
});

function TenderWorkspacePage() {
  const { tenderId } = Route.useParams();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const tenderQuery = useTender(session, org.activeOrgId, tenderId);
  const requirementsQuery = useTenderRequirements(session, tenderId, tenderQuery.data?.analysis_status === "analyzed");
  const analyze = useAnalyzeTender();

  const tender = tenderQuery.data;
  const requirements = requirementsQuery.data ?? [];
  const matched = requirements.filter((row) => row.status === "matched").length;
  const missing = requirements.filter((row) => row.status === "missing" || row.status === "expired").length;
  const review = requirements.length - matched - missing;

  const runAnalysis = async () => {
    try {
      await analyze.mutateAsync(tenderId);
      toast.success("Tender analysis completed or queued successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tender analysis failed.");
    }
  };

  if (org.bootstrapping || tenderQuery.isPending) {
    return <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 sm:py-12"><Skeleton className="h-6 w-32 rounded-lg" /><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }

  if (org.error || tenderQuery.error || !tender) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p className="text-sm font-medium">We couldn't load this tender workspace.</p><p className="mt-2 text-sm text-muted-foreground">{(org.error ?? tenderQuery.error)?.message ?? "Tender not found."}</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link to="/tenders">Back to tenders</Link></Button></div>;
  }

  const status = tender.analysis_status ?? "pending";
  const isProcessing = status === "processing" || analyze.isPending;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="rounded-xl px-2">
          <Link to="/tenders"><ArrowLeft className="mr-1.5 size-4" />Back to tenders</Link>
        </Button>
        <Button onClick={runAnalysis} disabled={isProcessing} className="rounded-xl">
          {isProcessing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
          {isProcessing ? "Analyzing..." : status === "analyzed" ? "Re-analyze tender" : "Analyze tender"}
        </Button>
      </div>

      <header className="glass-panel overflow-hidden rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">Tender Workspace</span>
              {tender.analysis_status ? <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">{tender.analysis_status}</span> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{tender.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{tender.procuring_entity ?? "Procuring entity not yet identified"}</p>
          </div>
          <div className="grid min-w-[240px] gap-3 rounded-2xl border border-border/60 bg-background/30 p-4 sm:grid-cols-2 lg:min-w-[340px]">
            <Metric label="Submission deadline" value={tender.submission_deadline ? formatDate(tender.submission_deadline) : "Not recorded"} />
            <Metric label="Readiness" value={typeof tender.compliance_percentage === "number" ? `${Math.round(tender.compliance_percentage)}%` : "Pending analysis"} />
            <Metric label="Lot" value={tender.title ? "See tender analysis" : "Not recorded"} />
            <Metric label="Uploaded" value={formatDate(tender.created_at)} />
          </div>
        </div>
      </header>

      {status === "failed" ? (
        <div className="mt-4 flex gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div><p className="text-sm font-medium">Tender analysis needs attention</p><p className="mt-1 text-sm text-muted-foreground">{tender.analysis_error ?? "The analysis could not be completed."}</p></div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
        <section className="glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Requirement intelligence</p><h2 className="mt-1 text-lg font-semibold">What this tender is asking for</h2></div>
            <FileText className="size-5 text-muted-foreground" />
          </div>

          {status !== "analyzed" ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <Sparkles className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Requirements are not ready yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Run tender analysis to extract the requirements from the uploaded document. JASMIQ will never invent a requirement that is not supported by the tender.</p>
            </div>
          ) : requirementsQuery.isPending ? (
            <div className="mt-5 space-y-3"><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /></div>
          ) : requirementsQuery.error ? (
            <p className="mt-5 text-sm text-muted-foreground">{(requirementsQuery.error as Error).message}</p>
          ) : requirements.length === 0 ? (
            <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">No requirements were extracted from this tender.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {requirements.map((requirement) => (
                <article key={requirement.id} className="rounded-xl border border-border/60 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center gap-2"><RequirementStatusBadge status={requirement.status} /><CategoryBadge category={requirement.category} />{requirement.requirement_name ? <h3 className="text-sm font-medium">{requirement.requirement_name}</h3> : null}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{requirement.requirement_text}</p>
                  {requirement.explanation ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{requirement.explanation}</p> : null}
                  {requirement.matched_document_id ? <p className="mt-2 text-xs font-medium text-success">Vault evidence linked</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="glass-panel rounded-2xl p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Readiness</p>
            <h2 className="mt-1 text-lg font-semibold">Evidence coverage</h2>
            {status === "analyzed" && requirements.length > 0 ? (
              <div className="mt-5 space-y-3">
                <CoverageRow label="Available evidence" value={matched} tone="success" />
                <CoverageRow label="Missing / expired" value={missing} tone="danger" />
                <CoverageRow label="Needs review" value={review} tone="warning" />
                <p className="pt-2 text-xs leading-5 text-muted-foreground">AI assists. You verify. A requirement is not submission-ready simply because a document was found.</p>
              </div>
            ) : <p className="mt-4 text-sm text-muted-foreground">Readiness analysis pending tender analysis.</p>}
          </section>

          <section className="glass-panel rounded-2xl p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tender-specific gates</p>
            <h2 className="mt-1 text-lg font-semibold">Mandatory items</h2>
            <div className="mt-4 space-y-2">
              {[
                ["Bank reference", tender.requires_bank_reference],
                ["Sworn affidavit", tender.requires_affidavit],
                ["Bid security", tender.requires_bid_security],
              ].map(([label, required]) => required ? <div key={String(label)} className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning-soft/40 px-3 py-2.5 text-sm"><CircleAlert className="size-4 text-warning" /><span>{label}</span></div> : null)}
              {!tender.requires_bank_reference && !tender.requires_affidavit && !tender.requires_bid_security ? <p className="text-sm text-muted-foreground">No tender-specific gate has been recorded.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next intelligence layer</p>
            <h2 className="mt-1 text-lg font-semibold">Company recommendation</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">JASMIQ will use verified company evidence, certifications, bank references and relevant past performance to recommend the strongest bidding company. This remains intentionally inactive until the evidence linkage is complete.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}

function CoverageRow({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "warning" }) {
  const classes = { success: "text-success", danger: "text-destructive", warning: "text-warning" };
  const icons = { success: CheckCircle2, danger: CircleAlert, warning: CircleAlert };
  const Icon = icons[tone];
  return <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 px-3 py-2.5"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className={`size-4 ${classes[tone]}`} />{label}</span><span className="text-sm font-semibold">{value}</span></div>;
}
