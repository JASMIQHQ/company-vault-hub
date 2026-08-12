import { BrainCircuit, FileSearch, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type JasmiqIntelligenceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getContext(pathname: string) {
  if (pathname.startsWith("/vault")) return "Your company vault";
  if (pathname.startsWith("/tenders")) return "Your tender workspace";
  if (pathname.startsWith("/companies")) return "Your company workspace";
  if (pathname.startsWith("/bank-references")) return "Your bank references";
  return "Your procurement workspace";
}

const capabilities = [
  { icon: FileSearch, label: "Document intelligence" },
  { icon: ShieldCheck, label: "Tender & compliance analysis" },
  { icon: Sparkles, label: "Company capability matching" },
];

export function JasmiqIntelligence({ open, onOpenChange }: JasmiqIntelligenceProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const context = getContext(pathname);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-border/60 bg-background/95 p-0 backdrop-blur-2xl sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-5 pr-14 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base">JASMIQ Intelligence</SheetTitle>
              <SheetDescription className="mt-0.5">Your procurement intelligence workspace.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100%-89px)] flex-col overflow-y-auto px-5 py-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <LockKeyhole className="size-3" />
                Engine not connected
              </span>
              <Sparkles className="size-4 text-primary" />
            </div>

            <h2 className="mt-5 text-lg font-semibold tracking-tight">JASMIQ Intelligence Workspace</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Connect the JASMIQ Intelligence Engine to analyze documents, interpret tender requirements,
              identify compliance gaps, and assist with procurement decisions.
            </p>

            <div className="mt-4 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
              Current context: <span className="font-medium text-foreground">{context}</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next phase</p>
            <div className="mt-3 space-y-2">
              {capabilities.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-3.5 py-3"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-xs leading-5 text-muted-foreground">
              This workspace is intentionally locked until the real intelligence engine is connected. No simulated
              answers or fabricated procurement conclusions are generated here.
            </div>
            <SheetClose asChild>
              <Button variant="outline" className="mt-4 w-full rounded-xl">
                <X className="mr-2 size-4" />
                Close workspace
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
