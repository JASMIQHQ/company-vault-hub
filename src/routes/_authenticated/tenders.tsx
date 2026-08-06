import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { CompanySelect } from "@/components/company-select";
import { TenderList } from "@/components/tenders/tender-list";
import { TenderUploadDialog } from "@/components/tenders/tender-upload-dialog";
import { CompanyPicker } from "@/components/vault/company-picker";
import { useCompanies } from "@/hooks/use-companies";
import { useTenders } from "@/hooks/use-tenders";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";

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

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        {org.multiCompany ? (
          <CompanySelect
            id="tender-company"
            label="Which company is preparing this tender?"
            organizations={org.organizations}
            value={activeOrg}
            onChange={org.setActiveOrgId}
          />
        ) : (
          <span />
        )}
        {activeOrg ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-xs">
              <CompanyPicker
                id="tender-company-select"
                label="Company"
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
