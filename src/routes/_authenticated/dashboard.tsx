import { createFileRoute } from "@tanstack/react-router";

import { GreetingCard } from "@/components/greeting-card";
import { CommandCenter } from "@/components/command-center";
import { CompanySelect } from "@/components/company-select";
import { useDashboardDocuments, useSession } from "@/hooks/use-vault";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useOrganizationRequirements, useDashboardTenders } from "@/hooks/use-tenders";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Jasmiq Procurement AI" },
      { name: "description", content: "Your procurement readiness at a glance: today's actions, tender deadlines and compliance status." },
      { property: "og:title", content: "Dashboard | Jasmiq Procurement AI" },
      { property: "og:description", content: "Your procurement readiness at a glance: today's actions, tender deadlines and compliance status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const documentsQuery = useDashboardDocuments(session, org.activeOrgId);
  const tendersQuery = useDashboardTenders(session, org.activeOrgId);
  const requirementsQuery = useOrganizationRequirements(session, org.activeOrgId);

  const documents = documentsQuery.data ?? [];
  const bootstrapping = org.bootstrapping;
  const orgMissing = !bootstrapping && !org.error && Boolean(session) && !org.activeOrgId;

  const focusWorkspace = () => {
    document.getElementById("workspace-selector")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <GreetingCard
        firstName={org.firstName}
        companyName={org.activeOrgName}
        organizationsCount={org.organizations.length}
        onCompanyChange={focusWorkspace}
      />

      {org.multiCompany ? (
        <div id="workspace-selector" className="jasmiq-workspace-bar mb-7">
          <CompanySelect
            id="dashboard-company"
            label="Active workspace"
            organizations={org.organizations}
            value={org.activeOrgId}
            onChange={org.setActiveOrgId}
          />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-foreground">Everything below is scoped to this company</p>
            <p className="mt-1 text-xs text-muted-foreground">Vault evidence, tender analysis and readiness stay isolated by workspace.</p>
          </div>
        </div>
      ) : null}

      {orgMissing ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-sm font-medium">No organization found for your account</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask an administrator to add you to an organization to get started.</p>
        </div>
      ) : (
        <CommandCenter
          companyName={org.activeOrgName}
          documents={documents}
          tenders={tendersQuery.data ?? []}
          requirements={requirementsQuery.data ?? []}
          isLoading={bootstrapping || documentsQuery.isPending || tendersQuery.isPending || requirementsQuery.isPending}
          hasError={Boolean(org.error ?? documentsQuery.error ?? tendersQuery.error ?? requirementsQuery.error)}
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
