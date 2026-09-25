import { ArrowUpRight, BrainCircuit, Sparkles } from "lucide-react";

interface GreetingCardProps { firstName?: string | null; companyName?: string | null; }

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingCard({ firstName, companyName }: GreetingCardProps) {
  return (
    <section className="jasmiq-hero relative mb-6 overflow-hidden rounded-[2rem] border border-white/70 p-5 shadow-[0_28px_90px_-42px_rgba(37,99,235,0.42)] sm:p-7 lg:p-8">
      <div className="jasmiq-hero-orb jasmiq-hero-orb-a" />
      <div className="jasmiq-hero-orb jasmiq-hero-orb-b" />
      <div className="jasmiq-hero-grid" />
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/65 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur-xl dark:bg-white/10">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/55" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>
            <BrainCircuit className="size-3.5" /> Procurement intelligence
          </div>
          <p className="text-sm font-medium text-muted-foreground">{greetingFor(new Date().getHours())}{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="mt-1 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[2.8rem]">Know what stands between your company and the next submission.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">JASMIQ connects tender requirements to company evidence, then turns gaps into a clear procurement mission.</p>
          {companyName ? <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/75 bg-white/60 px-3.5 py-2 text-sm font-medium shadow-sm backdrop-blur-xl dark:bg-white/10"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Sparkles className="size-3.5" /></span><span className="truncate">{companyName}</span><ArrowUpRight className="ml-1 size-3.5 shrink-0 text-muted-foreground" /></div> : null}
        </div>
        <div className="relative mx-auto hidden h-56 w-56 lg:block" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-primary/10 bg-white/20 shadow-inner backdrop-blur-xl" />
          <div className="absolute inset-7 rounded-full border border-primary/15 bg-white/25" />
          <div className="jasmiq-core absolute inset-[4.25rem] grid place-items-center rounded-full bg-primary/10 shadow-[0_0_70px_-16px_rgba(37,99,235,0.75)]"><BrainCircuit className="size-10 text-primary" /></div>
          <span className="jasmiq-orbit jasmiq-orbit-one" /><span className="jasmiq-orbit jasmiq-orbit-two" /><span className="jasmiq-orbit jasmiq-orbit-three" />
        </div>
      </div>
    </section>
  );
}
