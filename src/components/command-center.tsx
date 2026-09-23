import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildDeadlines, buildMissions, buildReadiness, formatRemaining, type Mission, type RequirementStatusCount, type Urgency, type DashboardDocument } from "@/lib/command-center";
import type { TenderListItem } from "@/lib/tenders";
import { formatDate } from "@/lib/vault";

const URGENCY_DOT: Record<Urgency, string> = { high: "bg-destructive", medium: "bg-warning", low: "bg-info" };
const URGENCY_LABEL: Record<Urgency, string> = { high: "High priority", medium: "Attention", low: "Planned" };

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warning" | "danger" }) {
  return <div className="rounded-xl border border-border/60 bg-background/40 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn("mt-1 text-xl font-semibold tracking-tight", tone === "danger" && "text-destructive", tone === "warning" && "text-warning")}>{value}</p>{hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function MissionRow({ mission }: { mission: Mission }) {
  const remaining = formatRemaining(mission.deadline ?? null);
  return <li className="flex flex-col gap-2 border-b border-border/50 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className={cn("mt-1.5 size-2 shrink-0 rounded-full", URGENCY_DOT[mission.urgency])} /><div><p className="text-sm font-medium">{mission.title}</p><p className="text-sm text-muted-foreground">{mission.detail}</p><p className="mt-0.5 text-xs text-muted-foreground">{URGENCY_LABEL[mission.urgency]}{remaining ? ` · ${remaining}` : ""}</p></div></div><Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl"><Link to={mission.action.to}>{mission.action.label}</Link></Button></li>;
}

interface CommandCenterProps {
  companyName: string | null;
  documents: DashboardDocument[];
  tenders: TenderListItem[];
  requirements: RequirementStatusCount[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function CommandCenter({ companyName, documents, tenders, requirements, isLoading, hasError, onRetry }: CommandCenterProps) {
  if (isLoading) return <section className="glass-panel mb-6 p-5 sm:p-6"><Skeleton className="h-5 w-40 rounded-lg" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((cell) => <Skeleton key={cell} className="h-20 rounded-xl" />)}</div></section>;
  if (hasError) return <section className="glass-panel mb-6 flex flex-col items-center gap-3 p-8 text-center"><p className="text-sm font-medium">We couldn't load your command center.</p><Button variant="outline" className="rounded-xl" onClick={onRetry}>Try again</Button></section>;

  const readiness = buildReadiness(documents, tenders, requirements);
  const missions = buildMissions(documents, tenders, requirements);
  const deadlines = buildDeadlines(tenders);

  return <section className="glass-panel mb-6 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold tracking-tight">Command Center</h2><p className="text-xs uppercase tracking-wide text-muted-foreground">{companyName ?? "Current company"}</p></div><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> AI assists. You verify.</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Active documents" value={String(readiness.activeDocuments)} hint={`${documents.length} total in vault`} />
      <Metric label="Expiring / expired" value={`${readiness.expiringDocuments} / ${readiness.expiredDocuments}`} hint="Next 30 days" tone={readiness.expiredDocuments > 0 ? "danger" : readiness.expiringDocuments > 0 ? "warning" : undefined} />
      <Metric label="Active tenders" value={String(readiness.activeTenders)} />
      <Metric label="Tender readiness" value={readiness.tenderReadiness === null ? "Readiness analysis pending connection of JASMIQ Intelligence Engine." : `${readiness.tenderReadiness}%`} hint={readiness.requirementsTotal > 0 ? `${readiness.requirementsVerified} of ${readiness.requirementsTotal} requirements matched` : "Requirements not yet analyzed"} />
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3"><p className="text-sm font-semibold tracking-tight">Today's Mission</p>{missions.length === 0 ? <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-4"><CheckCircle2 className="mt-0.5 size-4 text-success" /><div><p className="text-sm font-medium">You're all caught up.</p><p className="text-sm text-muted-foreground">No urgent procurement actions require your attention.</p></div></div> : <ul className="mt-1">{missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}</ul>}</div>
      <div className="lg:col-span-2"><p className="text-sm font-semibold tracking-tight">Upcoming deadlines</p>{deadlines.length === 0 ? <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-4"><CalendarClock className="mt-0.5 size-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">No submission deadlines recorded yet.</p></div> : <ul className="mt-2 space-y-2">{deadlines.map((item) => <li key={item.id} className="rounded-xl border border-border/60 bg-background/40 p-3"><p className="text-sm font-medium">{item.entity ?? item.title}</p><p className="text-xs text-muted-foreground">Submission deadline · {formatDate(item.deadline)}</p><p className={cn("mt-1 inline-flex items-center gap-1.5 text-xs font-medium", item.urgency === "high" && "text-destructive", item.urgency === "medium" && "text-warning", item.urgency === "low" && "text-muted-foreground")}>{item.urgency === "high" ? <AlertTriangle className="size-3.5" /> : null}{item.remaining}</p></li>)}</ul>}</div>
    </div>
  </section>;
}
