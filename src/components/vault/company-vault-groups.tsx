import { useState } from "react";
import { Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AddCompanyDialog } from "@/components/vault/add-company-dialog";
import { calculateCompanyReadiness, CompanyReadinessCard } from "@/components/vault/company-readiness-card";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/vault/document-list";
import { Skeleton } from "@/components/ui/skeleton";
import { sortByCanonicalOrder } from "@/lib/document-order";
import type { Company } from "@/hooks/use-companies";
import type { CompanyDocument } from "@/lib/vault";

interface CompanyVaultGroupsProps {
  organizationId: string;
  companies: Company[];
  documents: CompanyDocument[];
  allDocuments: CompanyDocument[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
}

function CompanyGroup({ company, documents, allCompanyDocuments, count, isLoading, error, onRetry, isFiltered, open, onToggle }: {
  company: Company;
  documents: CompanyDocument[];
  allCompanyDocuments: CompanyDocument[];
  count: number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const readiness = calculateCompanyReadiness(allCompanyDocuments);
  const readinessLabel = readiness.score === 100 ? "PROCUREMENT READY" : readiness.score >= 67 ? "ATTENTION" : "INCOMPLETE";

  return (
    <div className="group border-b border-white/[0.07] last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="relative flex min-h-[72px] w-full items-center gap-3 overflow-hidden px-4 py-3.5 text-left transition-all duration-300 hover:bg-white/[0.025] sm:min-h-[78px] sm:gap-4 sm:px-6">
        <span className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-primary/[0.035] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
        <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${open ? "border-primary/25 bg-primary/[0.10] text-primary shadow-[0_0_24px_rgba(59,130,246,0.10)]" : "border-white/10 bg-white/[0.035] text-muted-foreground group-hover:border-primary/20 group-hover:text-primary"}`}>
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>

        <span className="relative flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-primary/80 sm:flex"><Building2 className="size-4" /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{company.legal_name}</span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:hidden">{count} {count === 1 ? "document" : "documents"}</span>
          </span>
        </span>

        <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">{count} {count === 1 ? "document" : "documents"}</span>
        <span className={`relative hidden shrink-0 rounded-full border px-2.5 py-1.5 text-center sm:inline-flex ${readiness.score === 100 ? "border-emerald-400/15 bg-emerald-400/[0.045] text-emerald-300" : "border-amber-300/15 bg-amber-300/[0.045] text-amber-200"}`}>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.08em]">{readinessLabel}</span>
          <span className="mt-0.5 block text-[8px] font-medium text-current/70">{readiness.score}% coverage</span>
        </span>
        <span className={`relative shrink-0 rounded-full border px-2.5 py-1.5 text-center sm:hidden ${readiness.score === 100 ? "border-emerald-400/15 bg-emerald-400/[0.045] text-emerald-300" : "border-amber-300/15 bg-amber-300/[0.045] text-amber-200"}`}>
          <span className="block text-[10px] font-bold leading-none">{readiness.score}%</span>
        </span>
      </button>

      {open ? (
        <div className="relative border-t border-white/[0.06] bg-white/[0.012] px-3 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-20 bg-primary/[0.025] blur-3xl" />
          <div className="relative">
            <CompanyReadinessCard documents={allCompanyDocuments} />
            {documents.length === 0 && !isLoading && !error ? (
              <p className="px-1 pb-1 text-sm text-muted-foreground">{isFiltered ? "No documents match your search" : "No documents yet"}</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Evidence Vault</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Compliance evidence currently held for this company</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] font-medium text-muted-foreground">{count}</span>
                  </div>
                </div>
                <DocumentList documents={sortByCanonicalOrder(documents)} isLoading={isLoading} error={error} onRetry={onRetry} isFiltered={isFiltered} />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Company Vault presentation: a calm directory with one company open at a time. */
export function CompanyVaultGroups({ organizationId, companies, documents, allDocuments, isLoading, error, onRetry, isFiltered }: CompanyVaultGroupsProps) {
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(null);

  if (isLoading && companies.length === 0) {
    return <div className="space-y-3 p-6">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-16 w-full rounded-2xl" />)}</div>;
  }

  if (error && companies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium text-foreground">We couldn't load your companies.</p>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" className="rounded-xl" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.018] shadow-[0_24px_80px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="border-b border-white/[0.07] bg-white/[0.018] px-4 py-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Company Vault</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Select a company to inspect its evidence.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{companies.length} {companies.length === 1 ? "company" : "companies"}</span>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-medium">No companies yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a company to start organizing this organization's documents.</p>
        </div>
      ) : (
        companies.map((company) => {
          const companyDocuments = allDocuments.filter((document) => document.company_id === company.id);
          return <CompanyGroup key={company.id} company={company} documents={documents.filter((document) => document.company_id === company.id)} allCompanyDocuments={companyDocuments} count={companyDocuments.length} isLoading={isLoading} error={error} onRetry={onRetry} isFiltered={isFiltered} open={openCompanyId === company.id} onToggle={() => setOpenCompanyId((current) => current === company.id ? null : company.id)} />;
        })
      )}

      <div className="border-t border-white/[0.07] bg-white/[0.012] p-3 sm:p-4">
        <AddCompanyDialog organizationId={organizationId} trigger={<Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"><Plus className="mr-2 size-4" />Add Company</Button>} />
      </div>
    </div>
  );
}
