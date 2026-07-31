import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

const TIPS = [
  "Keep certificates renewed ahead of deadlines — expired documents disqualify strong bids.",
  "Name uploads clearly; reviewers should recognise a document without opening it.",
  "Re-check the submission deadline against the procuring entity's addenda before you file.",
];

const NOTES = [
  "Small, consistent preparation wins tenders.",
  "Every organised document is one less risk on submission day.",
  "Precision today is the shortest path to an award tomorrow.",
];

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

  const dayIndex = new Date().getDate();
  const tip = TIPS[dayIndex % TIPS.length];
  const note = NOTES[dayIndex % NOTES.length];

  const dismiss = () => {
    window.localStorage.setItem(todayKey(), "1");
    setVisible(false);
  };

  return (
    <section className="glass-panel relative mb-6 p-5 sm:p-6">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 rounded-lg"
        onClick={dismiss}
        aria-label="Dismiss greeting"
      >
        <X className="size-4" />
      </Button>
      <p className="text-base font-semibold tracking-tight sm:text-lg">
        {greetingFor(new Date().getHours())}
        {firstName ? `, ${firstName}` : ""}
      </p>
      {companyName ? (
        <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
          {companyName}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-foreground/80">{tip}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
