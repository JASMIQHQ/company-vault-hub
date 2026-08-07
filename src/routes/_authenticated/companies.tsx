import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanySelect } from "@/components/company-select";
import { AddCompanyDialog } from "@/components/vault/add-company-dialog";
import { useCompanies, type Company } from "@/hooks/use-companies";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [
      { title: "Companies | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "Manage the organizations and companies available in your procurement workspace.",
      },
      { property: "og:title", content: "Companies | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "Manage the organizations and companies available in your procurement workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompaniesPage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function CompanyRow({ company }: { company: Company }) {
  return (
    <Link
      to="/vault"
      className="flex flex-col gap-3 border-b border-border/50 p-4 text-left transition-colors last:border-b-0 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{company.legal_name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            RC {company.registration_number || "—"} · TIN{" "}
            {company.tax_identification_number || "—"} · Tax expiry{" "}
            {formatDate(company.tax_expiry_date)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-12 sm:pl-0">
        <Badge variant={company.is_active ? "default" : "secondary"} className="rounded-full">
          {company.is_active ? "ACTIVE" : "INACTIVE"}
        </Badge>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function CompaniesPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const companiesQuery = useCompanies(session, org.activeOrgId);

  const loading = org.bootstrapping || companiesQuery.isPending;
  const error = org.error ?? (companiesQuery.error as Error | null);
  const companies = companiesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {org.multiCompany ? (
        <div className="mb-6">
          <CompanySelect
            id="companies-organization"
            label="Which organization are you working in?"
            organizations={org.organizations}
            value={org.activeOrgId}
            onChange={org.setActiveOrgId}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Companies</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage the organizations and companies available in your procurement workspace.
          </p>
        </div>
        {org.activeOrgId ? (
          <AddCompanyDialog
            organizationId={org.activeOrgId}
            trigger={
              <Button className="rounded-xl w-full sm:w-auto">+ Add Company</Button>
            }
          />
        ) : null}
      </div>

      <section className="glass-panel mt-6 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">Unable to load companies</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong while fetching your companies.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => {
                org.refetch();
                companiesQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No companies yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Add your first company to begin organizing procurement documents and tender
              activity.
            </p>
            {org.activeOrgId ? (
              <div className="mt-4 flex justify-center">
                <AddCompanyDialog organizationId={org.activeOrgId} />
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            {companies.map((company) => (
              <CompanyRow key={company.id} company={company} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
