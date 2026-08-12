import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Building2, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Jasmiq Procurement AI" },
      {
        name: "description",
        content: "Manage your Jasmiq Procurement AI account, organization context and appearance.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const { theme, toggleTheme } = useTheme();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const displayName = org.firstName ?? session?.user.user_metadata?.full_name ?? "Account user";
  const email = session?.user.email ?? "Email unavailable";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">JASMIQ</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Account, organization context and appearance preferences.
        </p>
      </div>

      <div className="space-y-5">
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Account</h2>
              <p className="text-xs text-muted-foreground">Your current authenticated session.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
              <p className="mt-1 text-sm font-medium">{displayName}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-1 break-all text-sm font-medium">{email}</p>
            </div>
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Organization</h2>
              <p className="text-xs text-muted-foreground">Resolved from your existing membership context.</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current organization</p>
            <p className="mt-1 text-sm font-medium">
              {org.activeOrgName ?? (org.bootstrapping ? "Loading…" : "No organization found")}
            </p>
            {org.multiCompany ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Multiple organizations are available. Your active company is controlled by the shared organization selector.
              </p>
            ) : null}
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold">Appearance</h2>
              <p className="text-xs text-muted-foreground">Stored locally on this device.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Currently using {theme === "dark" ? "dark" : "light"} mode.
              </p>
            </div>
            <Button variant="outline" className="shrink-0 rounded-xl" onClick={toggleTheme}>
              {theme === "dark" ? "Use light mode" : "Use dark mode"}
            </Button>
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Session</h2>
              <p className="text-xs text-muted-foreground">End the current authenticated session.</p>
            </div>
          </div>

          <Separator className="my-5" />
          <Button variant="outline" className="rounded-xl" onClick={signOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </section>
      </div>
    </div>
  );
}
