import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { LogOut, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { DocumentList } from "@/components/vault/document-list";
import { UploadDialog } from "@/components/vault/upload-dialog";
import { useDocuments, useOrganizationId, useSession } from "@/hooks/use-vault";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Company Vault | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "Securely store, search, preview and download your company's procurement compliance documents.",
      },
      { property: "og:title", content: "Company Vault | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "Securely store, search, preview and download your company's procurement compliance documents.",
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

  const { session, isLoading: sessionLoading } = useSession();
  const orgQuery = useOrganizationId(session);
  const documentsQuery = useDocuments(session, orgQuery.data);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const documents = documentsQuery.data ?? [];
    if (!term) return documents;
    return documents.filter(
      (document) =>
        document.document_name.toLowerCase().includes(term) ||
        (document.document_type ?? "").toLowerCase().includes(term),
    );
  }, [documentsQuery.data, search]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const bootstrapping = sessionLoading || orgQuery.isPending;
  const orgMissing =
    !bootstrapping && !orgQuery.error && Boolean(session) && !orgQuery.data;

  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4.5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Company Vault</p>
              <p className="text-xs text-muted-foreground">Jasmiq Procurement AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Company Vault</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every compliance document your organization needs, in one secure place.
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
          {orgQuery.data ? <UploadDialog organizationId={orgQuery.data} /> : null}
        </div>

        <section className="glass-panel mt-6 overflow-hidden">
          {orgMissing ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium">No organization found for your account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask an administrator to add you to an organization before using the vault.
              </p>
            </div>
          ) : (
            <DocumentList
              documents={filtered}
              isLoading={orgQuery.isLoading || documentsQuery.isLoading}
              error={(orgQuery.error as Error | null) ?? (documentsQuery.error as Error | null)}
              onRetry={() => {
                orgQuery.refetch();
                documentsQuery.refetch();
              }}
              isFiltered={search.trim().length > 0}
            />
          )}
        </section>
      </main>
    </div>
  );
}
