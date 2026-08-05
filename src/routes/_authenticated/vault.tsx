import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LogOut, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { GreetingCard } from "@/components/greeting-card";
import { CommandCenter } from "@/components/command-center";
import { CompanySelect } from "@/components/company-select";
import { CompanyVaultGroups } from "@/components/vault/company-vault-groups";
import { BinDialog } from "@/components/vault/bin-dialog";
import { UploadDialog } from "@/components/vault/upload-dialog";
import { useDeletedDocuments, useDocuments, useSession } from "@/hooks/use-vault";

import { useCompanies } from "@/hooks/use-companies";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useOrganizationRequirements, useTenders } from "@/hooks/use-tenders";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Command Center | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "See your procurement readiness, today's actions and every compliance document your company needs in one secure command center.",
      },
      { property: "og:title", content: "Command Center | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "See your procurement readiness, today's actions and every compliance document your company needs in one secure command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const documentsQuery = useDocuments(session, org.activeOrgId);
  const companiesQuery = useCompanies(session, org.activeOrgId);
  const deletedQuery = useDeletedDocuments(session, org.activeOrgId);

  const tendersQuery = useTenders(session, org.activeOrgId);
  const requirementsQuery = useOrganizationRequirements(session, org.activeOrgId);

  const documents = documentsQuery.data ?? [];

  const categories = useMemo(() => {
    const found = new Set<string>();
    documents.forEach((document) => {
      if (document.category) found.add(document.category);
    });
    return Array.from(found).sort();
  }, [documents]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((document) => {
      const inCategory = category === "all" || document.category === category;
      if (!inCategory) return false;
      if (!term) return true;
      return (
        document.document_name.toLowerCase().includes(term) ||
        (document.document_type ?? "").toLowerCase().includes(term)
      );
    });
  }, [documents, search, category]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const bootstrapping = org.bootstrapping;
  const orgMissing = !bootstrapping && !org.error && Boolean(session) && !org.activeOrgId;

  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4.5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Command Center</p>
              <p className="text-xs text-muted-foreground">Jasmiq Procurement AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/tenders">Tender Command</Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <GreetingCard firstName={org.firstName} companyName={org.activeOrgName} />

        {org.multiCompany ? (
          <div className="mb-6">
            <CompanySelect
              id="vault-company"
              label="Which company are you working in?"
              organizations={org.organizations}
              value={org.activeOrgId}
              onChange={org.setActiveOrgId}
            />
          </div>
        ) : null}

        {orgMissing ? null : (
          <CommandCenter
            companyName={org.activeOrgName}
            documents={documents}
            tenders={tendersQuery.data ?? []}
            requirements={requirementsQuery.data ?? []}
            isLoading={
              bootstrapping ||
              documentsQuery.isPending ||
              tendersQuery.isPending ||
              requirementsQuery.isPending
            }
            hasError={Boolean(org.error ?? documentsQuery.error ?? tendersQuery.error)}
            onRetry={() => {
              org.refetch();
              documentsQuery.refetch();
              tendersQuery.refetch();
              requirementsQuery.refetch();
            }}
          />
        )}

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Company Vault</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {org.activeOrgName ? `${org.activeOrgName} — ` : ""}every compliance document this
          organization needs, in one secure place.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents"
              className="rounded-xl pl-9"
              aria-label="Search documents"
            />
          </div>
          <div className="flex items-center gap-1">
            <BinDialog
              documents={deletedQuery.data ?? []}
              companies={companiesQuery.data ?? []}
            />
            {org.activeOrgId ? <UploadDialog organizationId={org.activeOrgId} /> : null}
          </div>

        </div>

        {categories.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {["all", ...categories].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                  category === value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "all" ? "All documents" : value.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        ) : null}

        <section className="glass-panel mt-6 overflow-hidden">
          {orgMissing ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium">No organization found for your account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask an administrator to add you to an organization before using the vault.
              </p>
            </div>
          ) : (
            <CompanyVaultGroups
              organizationId={org.activeOrgId!}
              companies={companiesQuery.data ?? []}
              documents={filtered}
              allDocuments={documents}

              isLoading={bootstrapping || documentsQuery.isPending || companiesQuery.isPending}
              error={
                org.error ??
                (documentsQuery.error as Error | null) ??
                (companiesQuery.error as Error | null)
              }
              onRetry={() => {
                org.refetch();
                documentsQuery.refetch();
                companiesQuery.refetch();
              }}
              isFiltered={search.trim().length > 0 || category !== "all"}
            />
          )}
        </section>
      </main>
    </div>
  );
}
