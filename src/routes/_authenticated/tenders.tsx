import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { FileStack, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenderList } from "@/components/tenders/tender-list";
import { TenderUploadDialog } from "@/components/tenders/tender-upload-dialog";
import { useTenders } from "@/hooks/use-tenders";
import { useOrganizations, useProfile } from "@/hooks/use-profile";
import { useOrganizationId, useSession } from "@/hooks/use-vault";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tenders")({
  head: () => ({
    meta: [
      { title: "Tenders | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "Upload, store, preview and download your organization's tender and RFP documents.",
      },
      { property: "og:title", content: "Tenders | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "Upload, store, preview and download your organization's tender and RFP documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TendersPage,
});

function TendersPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const orgQuery = useOrganizationId(session);
  const profileQuery = useProfile(session);
  const orgsQuery = useOrganizations(session, profileQuery.data?.id);
  const organizations = orgsQuery.data ?? [];
  const multiCompany = organizations.length > 1;

  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const activeOrg = multiCompany
    ? (selectedOrg ?? organizations[0].id)
    : (orgQuery.data ?? organizations[0]?.id ?? null);

  const tendersQuery = useTenders(session, activeOrg);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const bootstrapping = sessionLoading || orgQuery.isPending;
  const orgMissing = !bootstrapping && !orgQuery.error && Boolean(session) && !activeOrg;


  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileStack className="size-4.5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Tenders</p>
              <p className="text-xs text-muted-foreground">Jasmiq Procurement AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/vault">Vault</Link>
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tenders</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upload tender and RFP documents and keep them securely stored.
        </p>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          {multiCompany ? (
            <div className="w-full max-w-xs">
              <Label htmlFor="tender-company" className="text-xs text-muted-foreground">
                Which company is preparing this tender?
              </Label>
              <select
                id="tender-company"
                className="mt-1.5 h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={activeOrg ?? ""}
                onChange={(event) => setSelectedOrg(event.target.value)}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span />
          )}
          {activeOrg ? <TenderUploadDialog organizationId={activeOrg} /> : null}
        </div>

        <section className="glass-panel mt-6 overflow-hidden">
          {orgMissing ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium">No organization found for your account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask an administrator to add you to an organization before uploading tenders.
              </p>
            </div>
          ) : (
            <TenderList
              session={session}
              tenders={tendersQuery.data ?? []}
              isLoading={bootstrapping || tendersQuery.isPending}
              error={(orgQuery.error as Error | null) ?? (tendersQuery.error as Error | null)}
              onRetry={() => {
                orgQuery.refetch();
                orgsQuery.refetch();
                tendersQuery.refetch();
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}
