import { ArrowUpRight, BrainCircuit, Building2, FileCheck2, Sparkles } from "lucide-react";

interface GreetingCardProps {
  firstName?: string | null;
  companyName?: string | null;
  organizationsCount?: number;
  onCompanyChange?: () => void;
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingCard({ firstName, companyName, organizationsCount = 1, onCompanyChange }: GreetingCardProps) {
  return (
    <section className="jasmiq-hero-v2 relative mb-7 overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_35px_110px_-48px_rgba(37,99,235,0.55)]">
      <div className="jasmiq-hero-v2-glow jasmiq-hero-v2-glow-a" />
      <div className="jasmiq-hero-v2-glow jasmiq-hero-v2-glow-b" />
      <div className="jasmiq-hero-v2-grid" />
      <div className="relative z-10 grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.08fr_.92fr] lg:p-10">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="jasmiq-reveal inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur-2xl dark:bg-white/[0.08]">
            <span className="relative grid size-2">
              <span className="jasmiq-ping absolute inset-0 rounded-full bg-primary/45" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
            <BrainCircuit className="size-3.5" />
            Procurement intelligence
          </div>

          <p className="jasmiq-reveal mt-5 text-sm font-medium text-muted-foreground [animation-delay:90ms]">
            {greetingFor(new Date().getHours())}{firstName ? \`, \${firstName}\` : ""}
          </p>

          <h1 className="jasmiq-reveal mt-1 max-w-3xl text-[2.35rem] font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl lg:text-[4rem] [animation-delay:140ms]">
            Turn procurement
            <span className="block bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              complexity into clarity.
            </span>
          </h1>

          <p className="jasmiq-reveal mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 [animation-delay:200ms]">
            JASMIQ reads the tender, connects requirements to verified company evidence, and shows exactly what stands between you and a submission.
          </p>

          <div className="jasmiq-reveal mt-7 flex flex-wrap items-center gap-3 [animation-delay:260ms]">
            <button
              type="button"
              onClick={onCompanyChange}
              className="group inline-flex min-w-0 items-center gap-3 rounded-2xl border border-white/75 bg-white/65 px-3.5 py-2.5 text-left shadow-[0_14px_35px_-22px_rgba(37,99,235,.45)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Active workspace</span>
                <span className="block max-w-[220px] truncate text-sm font-semibold">{companyName ?? "Select a company"}</span>
              </span>
              {organizationsCount > 1 ? <ArrowUpRight className="ml-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /> : null}
            </button>

            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <FileCheck2 className="size-4 text-success" />
              Evidence-first
            </div>
          </div>
        </div>

        <div className="relative min-h-[270px] overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/30 p-4 shadow-inner backdrop-blur-2xl dark:bg-white/[0.035] sm:min-h-[320px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(59,130,246,.18),transparent_30%),radial-gradient(circle_at_82%_80%,rgba(34,211,238,.12),transparent_30%)]" />
          <div className="absolute inset-x-8 top-8 flex justify-between text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
            <span>Evidence</span><span>Readiness</span>
          </div>

          <div className="jasmiq-hero-orbit-v2 absolute left-1/2 top-[52%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />
          <div className="jasmiq-hero-orbit-v2 jasmiq-hero-orbit-v2-b absolute left-1/2 top-[52%] size-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />

          <div className="jasmiq-intelligence-core absolute left-1/2 top-[52%] grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2rem] border border-white/80 bg-white/55 shadow-[0_25px_70px_-25px_rgba(37,99,235,.6)] backdrop-blur-2xl dark:bg-white/[0.08]">
            <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_55px_-18px_rgba(37,99,235,.9)]">
              <Sparkles className="size-7" />
            </div>
          </div>

          <div className="jasmiq-float-card absolute left-5 top-[44%] rounded-2xl border border-white/80 bg-white/65 px-3 py-2 shadow-[0_18px_45px_-24px_rgba(15,23,42,.35)] backdrop-blur-2xl dark:bg-white/[0.08]">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Vault</p>
            <p className="mt-0.5 text-sm font-semibold">Evidence linked</p>
          </div>

          <div className="jasmiq-float-card jasmiq-float-card-b absolute right-5 top-[61%] rounded-2xl border border-white/80 bg-white/65 px-3 py-2 shadow-[0_18px_45px_-24px_rgba(15,23,42,.35)] backdrop-blur-2xl dark:bg-white/[0.08]">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tender</p>
            <p className="mt-0.5 text-sm font-semibold">Gap detected</p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
            {["Tender", "Evidence", "Action"].map((item, index) => (
              <div key={item} className="rounded-xl border border-white/70 bg-white/45 px-2 py-2 text-center backdrop-blur-xl dark:bg-white/[0.05]">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{index + 1} · {item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
