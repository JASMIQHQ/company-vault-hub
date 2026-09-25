import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildDeadlines, buildMissions, buildReadiness, formatRemaining, type Mission, type RequirementStatusCount, type Urgency, type DashboardDocument } from "@/lib/command-center";
import type { TenderListItem } from "@/lib/tenders";
import { formatDate } from "@/lib/vault";

const URGENCY_DOT: Record<Urgency, string> = { high: "bg-destructive", medium: "bg-warning", low: "bg-info" };
const URGENCY_LABEL: Record<Urgency, string> = { high: "High priority", medium: "Attention", low: "Planned" };

function Metric({ label, value, hint, tone, index }: { label: string; value: string; hint?: string; tone?: "warning" | "danger"; index: number }) {
  return (
    <div className="jasmiq-metric group relative overflow-hidden rounded-2xl border border-border/60 bg-background/35 p-4 backdrop-blur-md" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="jasmiq-metric-glow" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <span className="size-1.5 rounded-full bg-primary/70 shadow-[0_0_12px_var(--primary)] transition-transform duration-300 group-hover:scale-150" />
        </div>
        <p className={cn("mt-2 text-2xl font-semibold tracking-[-0.04em]", tone === "danger" && "text-destructive", tone === "warning" && "text-warning")}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function MissionRow({ mission, index }: { mission: Mission; index: number }) {
  const remaining = formatRemaining(mission.deadline ?? null);
  return (
    <li className="jasmiq-mission group flex flex-col gap-3 border-b border-border/50 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex gap-3">
        <span className="relative mt-1.5 flex size-2 shrink-0">
          <span className={cn("absolute size-2 rounded-full opacity-40 blur-[2px]", URGENCY_DOT[mission.urgency])} />
          <span className={cn("relative size-2 rounded-full", URGENCY_DOT[mission.urgency])} />
        </span>
        <div>
          <p className="text-sm font-medium transition-colors group-hover:text-primary">{mission.title}</p>
          <p className="text-sm leading-5 text-muted-foreground">{mission.detail}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{URGENCY_LABEL[mission.urgency]}{remaining ? ` · ${remaining}` : ""}</p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl border-primary/15 bg-background/30 transition-all duration-300 group-hover:border-primary/35 group-hover:bg-primary/5">
        <Link to={mission.action.to}>{mission.action.label}</Link>
      </Button>
    </li>
  );
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

  return (
    <section className="jasmiq-command glass-panel relative mb-6 overflow-hidden p-5 sm:p-6">
      <div className="jasmiq-command-line" aria-hidden="true" />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Zap className="size-3.5" /></span>
              <h2 className="text-sm font-semibold tracking-tight">Command Center</h2>
            </div>
            <p className="mt-1 pl-9 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{companyName ?? "Current company"} · live evidence state</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> AI assists · You verify</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric index={0} label="Active documents" value={String(readiness.activeDocuments)} hint={`${documents.length} total in vault`} />
          <Metric index={1} label="Expiring / expired" value={`${readiness.expiringDocuments} / ${readiness.expiredDocuments}`} hint="Next 30 days" tone={readiness.expiredDocuments > 0 ? "danger" : readiness.expiringDocuments > 0 ? "warning" : undefined} />
          <Metric index={2} label="Active tenders" value={String(readiness.activeTenders)} />
          <Metric index={3} label="Tender readiness" value={readiness.tenderReadiness === null ? "—" : `${readiness.tenderReadiness}%`} hint={readiness.tenderReadiness === null ? "Readiness analysis pending" : readiness.requirementsTotal > 0 ? `${readiness.requirementsVerified} of ${readiness.requirementsTotal} requirements matched` : "Requirements not yet analyzed"} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-tight">Today's Mission</p>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{missions.length} active signal{missions.length === 1 ? "" : "s"}</span>
            </div>
            {missions.length === 0 ? <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-4"><CheckCircle2 className="mt-0.5 size-4 text-success" /><div><p className="text-sm font-medium">You're all caught up.</p><p className="text-sm text-muted-foreground">No urgent procurement actions require your attention.</p></div></div> : <ul className="mt-1">{missions.map((mission, index) => <MissionRow key={mission.id} mission={mission} index={index} />)}</ul>}
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-tight">Upcoming deadlines</p>
              <CalendarClock className="size-4 text-primary/70" />
            </div>
            {deadlines.length === 0 ? <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-4"><CalendarClock className="mt-0.5 size-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">No submission deadlines recorded yet.</p></div> : <ul className="mt-2 space-y-2">{deadlines.map((item) => <li key={item.id} className="rounded-xl border border-border/60 bg-background/40 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-elegant"><p className="text-sm font-medium">{item.entity ?? item.title}</p><p className="text-xs text-muted-foreground">Submission deadline · {formatDate(item.deadline)}</p><p className={cn("mt-1 inline-flex items-center gap-1.5 text-xs font-medium", item.urgency === "high" && "text-destructive", item.urgency === "medium" && "text-warning", item.urgency === "low" && "text-muted-foreground")}>{item.urgency === "high" ? <AlertTriangle className="size-3.5" /> : null}{item.remaining}</p></li>)}</ul>}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-border/50 pt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Deterministic evidence spine · Company → Vault → Tender → Requirement → Evidence → Readiness
        </div>
      </div>
    </section>
  );
}
