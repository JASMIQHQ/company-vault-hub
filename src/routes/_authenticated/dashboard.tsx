import { createFileRoute } from "@tanstack/react-router";

import { GreetingCard } from "@/components/greeting-card";
import { CommandCenter } from "@/components/command-center";
import { CompanySelect } from "@/components/company-select";
import { useDocuments, useSession } from "@/hooks/use-vault";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useOrganizationRequirements, useTenders } from "@/hooks/use-tenders";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "Your procurement readiness at a glance: today's actions, tender deadlines and compliance status.",
      },
      { property: "og:title", content: "Dashboard | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "Your procurement readiness at a glance: today's actions, tender deadlines and compliance status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const documentsQuery = useDocuments(session, org.activeOrgId);
  const tendersQuery = useTenders(session, org.activeOrgId);
  const requirementsQuery = useOrganizationRequirements(session, org.activeOrgId);

  const documents = documentsQuery.data ?? [];
  const bootstrapping = org.bootstrapping;
  const orgMissing = !bootstrapping && !org.error && Boolean(session) && !org.activeOrgId;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <GreetingCard firstName={org.firstName} companyName={org.activeOrgName} />

      {org.multiCompany ? (
        <div className="mb-6">
          <CompanySelect
            id="dashboard-company"
            label="Which company are you working in?"
            organizations={org.organizations}
            value={org.activeOrgId}
            onChange={org.setActiveOrgId}
          />
        </div>
      ) : null}

      {orgMissing ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-sm font-medium">No organization found for your account</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an administrator to add you to an organization to get started.
          </p>
        </div>
      ) : (
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
    </div>
  );
}
