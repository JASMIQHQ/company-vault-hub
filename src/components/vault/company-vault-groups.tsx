import { useState } from "react";
import { Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AddCompanyDialog } from "@/components/vault/add-company-dialog";
import { CompanyReadinessCard } from "@/components/vault/company-readiness-card";
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
  /** All active documents, used for company counts independent of search filters. */
  allDocuments: CompanyDocument[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
}

function CompanyGroup({
  company,
  documents,
  allCompanyDocuments,
  count,
  isLoading,
  error,
  onRetry,
  isFiltered,
}: {
  company: Company;
  documents: CompanyDocument[];
  allCompanyDocuments: CompanyDocument[];
  count: number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
}) {
  // Companies start collapsed so the Vault behaves like a clean company directory,
  // not a long document wall.
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-primary/[0.04] sm:px-6"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <Building2 className="size-4 shrink-0 text-primary/80" />
          <span className="truncate text-sm font-semibold text-foreground">{company.legal_name}</span>
        </span>
        <span className="shrink-0 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {count} {count === 1 ? "document" : "documents"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-border/30 bg-background/[0.12] px-4 pb-5 pt-4 sm:px-6">
          <CompanyReadinessCard documents={allCompanyDocuments} />
          {documents.length === 0 && !isLoading && !error ? (
            <p className="px-1 pb-1 text-sm text-muted-foreground">
              {isFiltered ? "No documents match your search" : "No documents yet"}
            </p>
          ) : (
            <DocumentList
              documents={sortByCanonicalOrder(documents)}
              isLoading={isLoading}
              error={error}
              onRetry={onRetry}
              isFiltered={isFiltered}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Company Vault presentation: companies stay compact until the user opens one. */
export function CompanyVaultGroups({
  organizationId,
  companies,
  documents,
  allDocuments,
  isLoading,
  error,
  onRetry,
  isFiltered,
}: CompanyVaultGroupsProps) {
  if (isLoading && companies.length === 0) {
    return (
      <div className="space-y-3 p-6">
        {[0, 1, 2].map((row) => <Skeleton key={row} className="h-12 w-full rounded-xl" />)}
      </div>
    );
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
    <div>
      {companies.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-medium">No companies yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a company to start organizing this organization's documents.</p>
        </div>
      ) : (
        companies.map((company) => {
          const companyDocuments = allDocuments.filter((document) => document.company_id === company.id);
          return (
            <CompanyGroup
              key={company.id}
              company={company}
              documents={documents.filter((document) => document.company_id === company.id)}
              allCompanyDocuments={companyDocuments}
              count={companyDocuments.length}
              isLoading={isLoading}
              error={error}
              onRetry={onRetry}
              isFiltered={isFiltered}
            />
          );
        })
      )}
      <div className="border-t border-border/50 p-4">
        <AddCompanyDialog
          organizationId={organizationId}
          trigger={<Button variant="ghost" size="sm" className="rounded-xl"><Plus className="mr-2 size-4" />Add Company</Button>}
        />
      </div>
    </div>
  );
}
