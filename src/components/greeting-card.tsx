import { useEffect, useState } from "react";
import { BrainCircuit, X } from "lucide-react";

import { Button } from "@/components/ui/button";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayKey() {
  return `jasmiq-greeting-dismissed-${new Date().toDateString()}`;
}

interface GreetingCardProps {
  firstName?: string | null;
  companyName?: string | null;
}

export function GreetingCard({ firstName, companyName }: GreetingCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(todayKey()) !== "1");
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(todayKey(), "1");
    setVisible(false);
  };

  return (
    <section className="jasmiq-hero glass-panel relative mb-6 overflow-hidden p-6 sm:p-8">
      <div className="jasmiq-hero-grid" aria-hidden="true" />
      <div className="jasmiq-hero-orbit jasmiq-hero-orbit-one" aria-hidden="true" />
      <div className="jasmiq-hero-orbit jasmiq-hero-orbit-two" aria-hidden="true" />
      <div className="jasmiq-hero-scan" aria-hidden="true" />
      <div className="jasmiq-hero-pulse" aria-hidden="true" />

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 z-20 rounded-xl bg-background/20 backdrop-blur-md"
        onClick={dismiss}
        aria-label="Dismiss greeting"
      >
        <X className="size-4" />
      </Button>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            JASMIQ / PROCUREMENT INTELLIGENCE
          </div>

          <p className="text-sm font-medium text-primary/90">{greetingFor(new Date().getHours())}{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Turn tender chaos into
            <span className="jasmiq-gradient-text ml-2">submission intelligence.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-foreground/70 sm:text-base">
            JASMIQ watches your Vault, tender requirements and evidence state so you can focus on closing the gaps that matter.
          </p>

          {companyName ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/35 px-3 py-2 text-xs backdrop-blur-md">
              <BrainCircuit className="size-4 text-primary" />
              <span className="text-muted-foreground">Active workspace</span>
              <span className="font-semibold">{companyName}</span>
            </div>
          ) : null}

        </div>

        <div className="jasmiq-intelligence-core hidden size-44 lg:block" aria-label="JASMIQ intelligence visualization">
          <div className="jasmiq-core-ring jasmiq-core-ring-a" />
          <div className="jasmiq-core-ring jasmiq-core-ring-b" />
          <div className="jasmiq-core-ring jasmiq-core-ring-c" />
          <div className="jasmiq-core-center">
            <BrainCircuit className="size-8 text-primary" />
            <span>LIVE</span>
          </div>
          <span className="jasmiq-core-node jasmiq-core-node-a" />
          <span className="jasmiq-core-node jasmiq-core-node-b" />
          <span className="jasmiq-core-node jasmiq-core-node-c" />
        </div>
      </div>
    </section>
  );
}
