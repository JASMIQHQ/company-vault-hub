import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  BrainCircuit,
  Building2,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { JasmiqIntelligence } from "@/components/intelligence/jasmiq-intelligence";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to?: "/dashboard" | "/vault" | "/tenders" | "/companies" | "/bank-references" | "/settings";
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Vault", to: "/vault", icon: ShieldCheck },
  { label: "Tenders", to: "/tenders", icon: FileStack },
  { label: "Companies", to: "/companies", icon: Building2 },
  { label: "Bank References", to: "/bank-references", icon: Banknote },
  { label: "Settings", to: "/settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to;
        return (
          <Link
            key={item.label}
            to={item.to!}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck className="size-4.5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">JASMIQ</p>
        <p className="text-xs text-muted-foreground">Procurement AI</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-app-gradient">
      <JasmiqIntelligence open={intelligenceOpen} onOpenChange={setIntelligenceOpen} />

      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/50 bg-background/50 px-4 py-5 backdrop-blur-xl lg:flex">
          <Brand />
          <div className="mt-6 flex-1">
            <NavLinks />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mb-2 justify-start gap-2 rounded-xl border-primary/20 bg-primary/[0.04] text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setIntelligenceOpen(true)}
          >
            <BrainCircuit className="size-4" />
            JASMIQ Intelligence
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 rounded-xl"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/50 bg-background/60 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl lg:hidden"
                      aria-label="Open navigation"
                    >
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-5">
                    <Brand />
                    <div className="mt-6">
                      <NavLinks onNavigate={() => setMobileOpen(false)} />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-5 w-full justify-start gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => {
                        setMobileOpen(false);
                        setIntelligenceOpen(true);
                      }}
                    >
                      <BrainCircuit className="size-4" />
                      JASMIQ Intelligence
                    </Button>
                  </SheetContent>
                </Sheet>
                <div className="lg:hidden">
                  <Brand />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden gap-2 rounded-xl text-primary hover:bg-primary/10 hover:text-primary sm:inline-flex"
                  onClick={() => setIntelligenceOpen(true)}
                >
                  <BrainCircuit className="size-4" />
                  Intelligence
                </Button>
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl lg:hidden"
                  onClick={signOut}
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
