import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanySelect } from "@/components/company-select";
import { CompanyVaultGroups } from "@/components/vault/company-vault-groups";
import { BinDialog } from "@/components/vault/bin-dialog";
import { UploadDialog } from "@/components/vault/upload-dialog";
import { useDeletedDocuments, useDocuments, useSession } from "@/hooks/use-vault";

import { useCompanies } from "@/hooks/use-companies";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Company Vault | Jasmiq Procurement AI" },
      { name: "description", content: "Every compliance document your company needs, grouped by company in one secure vault." },
      { property: "og:title", content: "Company Vault | Jasmiq Procurement AI" },
      { property: "og:description", content: "Every compliance document your company needs, grouped by company in one secure vault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const documentsQuery = useDocuments(session, org.activeOrgId);
  const companiesQuery = useCompanies(session, org.activeOrgId);
  const deletedQuery = useDeletedDocuments(session, org.activeOrgId);
  const documents = documentsQuery.data ?? [];

  const categories = useMemo(() => {
    const found = new Set<string>();
    documents.forEach((document) => {
      if (document.category) found.add(document.category);
    });
    return Array.from(found).sort();
  }, [documents]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return documents.filter((document) => {
      if (category !== "all" && document.category !== category) return false;
      if (!term) return true;
      return document.document_name.toLowerCase().includes(term) ||
        (document.document_type ?? "").toLowerCase().includes(term) ||
        (document.category ?? "").toLowerCase().replace(/_/g, " ").includes(term);
    });
  }, [documents, debouncedSearch, category]);

  const bootstrapping = org.bootstrapping;
  const orgMissing = !bootstrapping && !org.error && Boolean(session) && !org.activeOrgId;
  const isFiltered = Boolean(debouncedSearch) || category !== "all";

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -left-24 top-0 -z-0 size-72 rounded-full bg-primary/[0.08] blur-3xl dark:bg-primary/[0.07]" />
      <div className="pointer-events-none absolute -right-28 top-32 -z-0 size-80 rounded-full bg-cyan-400/[0.06] blur-3xl dark:bg-cyan-400/[0.05]" />

      {org.multiCompany ? (
        <div className="relative z-10 mb-6">
          <CompanySelect id="vault-company" label="Which company are you working in?" organizations={org.organizations} value={org.activeOrgId} onChange={org.setActiveOrgId} />
        </div>
      ) : null}

      <div className="relative z-10 rounded-[2rem] border border-white/60 bg-white/[0.34] p-5 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025] dark:shadow-[0_28px_80px_-36px_rgba(0,0,0,0.65)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_currentColor]" /> Evidence intelligence
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Company Vault</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              {org.activeOrgName ? `${org.activeOrgName} — ` : ""}every compliance document this organization needs, in one secure place.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-white/70 bg-white/[0.42] px-4 py-3 text-right shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-white/10 dark:bg-white/[0.035] sm:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Evidence control</p>
            <p className="mt-1 text-xs font-semibold text-foreground">Procurement-grade vault</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" className="rounded-xl border-white/70 bg-white/55 pl-9 pr-9 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]" aria-label="Search documents" />
            {search ? (
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-7 -translate-y-1/2 rounded-lg" onClick={() => setSearch("")} aria-label="Clear document search">
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <BinDialog documents={deletedQuery.data ?? []} companies={companiesQuery.data ?? []} />
            {org.activeOrgId ? <UploadDialog organizationId={org.activeOrgId} /> : null}
          </div>
        </div>

        {categories.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {["all", ...categories].map((value) => (
              <button key={value} type="button" onClick={() => setCategory(value)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors", category === value ? "border-primary/30 bg-primary/10 text-primary shadow-[0_8px_20px_-14px_rgba(37,99,235,0.5)]" : "border-border/60 bg-white/25 text-muted-foreground hover:bg-white/50 hover:text-foreground dark:bg-white/[0.02] dark:hover:bg-white/[0.06]") }>
                {value === "all" ? "All documents" : value.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="relative z-10 mt-6 overflow-hidden rounded-[2rem] border border-white/65 bg-white/[0.48] shadow-[0_32px_90px_-38px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025] dark:shadow-[0_32px_90px_-38px_rgba(0,0,0,0.65)]">
        {orgMissing ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">No organization found for your account</p>
            <p className="mt-1 text-sm text-muted-foreground">Ask an administrator to add you to an organization before using the vault.</p>
          </div>
        ) : (
          <CompanyVaultGroups
            organizationId={org.activeOrgId!}
            companies={companiesQuery.data ?? []}
            documents={filtered}
            allDocuments={documents}
            isLoading={bootstrapping || documentsQuery.isPending || companiesQuery.isPending}
            error={org.error ?? (documentsQuery.error as Error | null) ?? (companiesQuery.error as Error | null)}
            onRetry={() => { org.refetch(); documentsQuery.refetch(); companiesQuery.refetch(); }}
            isFiltered={isFiltered}
          />
        )}
      </section>
    </div>
  );
}
