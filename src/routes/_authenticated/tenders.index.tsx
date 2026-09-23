import { useState } from "react";

import { CompanySelect } from "@/components/company-select";
import { TenderList } from "@/components/tenders/tender-list";
import { TenderUploadDialog } from "@/components/tenders/tender-upload-dialog";
import { CompanyPicker } from "@/components/vault/company-picker";
import { useCompanies } from "@/hooks/use-companies";
import { useTenders } from "@/hooks/use-tenders";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tenders/")({
  component: TendersPage,
});

function TendersPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const activeOrg = org.activeOrgId;

  const tendersQuery = useTenders(session, activeOrg);
  const companiesQuery = useCompanies(session, activeOrg);
  const companies = companiesQuery.data ?? [];
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const tenderCompanyId =
    selectedCompany && companies.some((c) => c.id === selectedCompany)
      ? selectedCompany
      : (companies[0]?.id ?? null);
  const setTenderCompanyId = setSelectedCompany;

  const bootstrapping = org.bootstrapping;
  const orgMissing = !bootstrapping && !org.error && Boolean(session) && !activeOrg;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tender Command</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Upload tender and RFP documents and keep them securely stored.
      </p>

      <div className="mt-6 rounded-2xl border border-border/60 bg-muted/10 p-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        {org.multiCompany ? (
          <CompanySelect
            id="tender-workspace"
            label="Workspace"
            organizations={org.organizations}
            value={activeOrg}
            onChange={org.setActiveOrgId}
          />
        ) : (
          </div>
        {activeOrg ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-xs">
              <CompanyPicker
                id="tender-company-select"
                label="Preparing company"
                organizationId={activeOrg}
                companies={companies}
                value={tenderCompanyId}
                onChange={setTenderCompanyId}
              />
            </div>
            {tenderCompanyId ? (
              <TenderUploadDialog organizationId={activeOrg} companyId={tenderCompanyId} />
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      <section className="glass-panel mt-6 overflow-hidden">
        {orgMissing ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">No workspace found for your account</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask an administrator to add you to a workspace before uploading tenders.
            </p>
          </div>
        ) : (
          <TenderList
            session={session}
            tenders={tendersQuery.data ?? []}
            isLoading={bootstrapping || tendersQuery.isPending}
            error={org.error ?? (tendersQuery.error as Error | null)}
            onRetry={() => {
              org.refetch();
              tendersQuery.refetch();
            }}
          />
        )}
      </section>
    </div>
  );
}
