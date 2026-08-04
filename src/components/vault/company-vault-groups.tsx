import { useState } from "react";
import { Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AddCompanyDialog } from "@/components/vault/add-company-dialog";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/vault/document-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "@/hooks/use-companies";
import type { CompanyDocument } from "@/lib/vault";

interface CompanyVaultGroupsProps {
  organizationId: string;
  companies: Company[];
  documents: CompanyDocument[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
}

function CompanyGroup({
  company,
  documents,
  isLoading,
  error,
  onRetry,
  isFiltered,
}: {
  company: Company;
  documents: CompanyDocument[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <Building2 className="size-4 text-primary" />
        <span className="text-sm font-semibold">{company.legal_name}</span>
        <span className="text-xs text-muted-foreground">
          ({documents.length} {documents.length === 1 ? "document" : "documents"})
        </span>
      </button>
      {open ? (
        documents.length === 0 && !isLoading && !error ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            {isFiltered ? "No documents match your search" : "No documents yet"}
          </p>
        ) : (
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            isFiltered={isFiltered}
          />
        )
      ) : null}
    </div>
  );
}

/** Company Vault presentation: documents grouped under their owning company. */
export function CompanyVaultGroups({
  organizationId,
  companies,
  documents,
  isLoading,
  error,
  onRetry,
  isFiltered,
}: CompanyVaultGroupsProps) {
  if (isLoading && companies.length === 0) {
    return (
      <div className="space-y-3 p-6">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error && companies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium text-foreground">We couldn't load your companies.</p>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" className="rounded-xl" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {companies.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-medium">No companies yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a company to start organizing this organization's documents.
          </p>
        </div>
      ) : (
        companies.map((company) => (
          <CompanyGroup
            key={company.id}
            company={company}
            documents={documents.filter((document) => document.company_id === company.id)}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            isFiltered={isFiltered}
          />
        ))
      )}
      <div className="border-t border-border/50 p-4">
        <AddCompanyDialog
          organizationId={organizationId}
          trigger={
            <Button variant="ghost" size="sm" className="rounded-xl">
              <Plus className="mr-2 size-4" />
              Add Company
            </Button>
          }
        />
      </div>
    </div>
  );
}
