import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BankReferenceTable } from "@/components/bank-references/bank-reference-table";
import { CompanySelect } from "@/components/company-select";
import {
  useBankReferenceRequests,
  useBankReferenceTemplateCount,
} from "@/hooks/use-bank-reference-requests";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";
import { isExpired } from "@/lib/bank-references";

export const Route = createFileRoute("/_authenticated/bank-references")({
  head: () => ({
    meta: [
      { title: "Bank References | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "Track bank reference requests across your procurement workspace, with status, dates and expiry.",
      },
      { property: "og:title", content: "Bank References | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "Track bank reference requests across your procurement workspace, with status, dates and expiry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankReferencesPage,
});

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel px-4 py-3.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function BankReferencesPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const requestsQuery = useBankReferenceRequests(session, org.activeOrgId);
  const templateCountQuery = useBankReferenceTemplateCount(session, org.activeOrgId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const requests = requestsQuery.data ?? [];
  const loading = org.bootstrapping || requestsQuery.isPending;
  const error = org.error ?? (requestsQuery.error as Error | null);

  const kpis = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "draft" || r.status === "requested").length,
      processing: requests.filter((r) => r.status === "processing").length,
      received: requests.filter((r) => r.status === "received" && !isExpired(r)).length,
      expired: requests.filter(isExpired).length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((item) => {
      if (status !== "all" && (item.status ?? "") !== status) return false;
      if (!term) return true;
      return [item.bank_name, item.company_name, item.tender_title]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [requests, search, status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {org.multiCompany ? (
        <div className="mb-6">
          <CompanySelect
            id="bank-references-organization"
            label="Which organization are you working in?"
            organizations={org.organizations}
            value={org.activeOrgId}
            onChange={org.setActiveOrgId}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bank References</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Track bank reference requests across your procurement workspace.
          </p>
        </div>
        <Button className="w-full rounded-xl sm:w-auto" disabled title="Coming in the next phase">
          New Bank Reference
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Total" value={kpis.total} />
        <Kpi label="Pending" value={kpis.pending} />
        <Kpi label="Processing" value={kpis.processing} />
        <Kpi label="Received" value={kpis.received} />
        <Kpi label="Expired" value={kpis.expired} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          className="h-9 max-w-xs rounded-xl"
          placeholder="Search bank, company or tender"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-9 rounded-xl border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="requested">Requested</option>
          <option value="processing">Processing</option>
          <option value="received">Received</option>
        </select>
        {templateCountQuery.data ? (
          <span className="text-xs text-muted-foreground">
            {templateCountQuery.data} template{templateCountQuery.data === 1 ? "" : "s"} stored
            separately
          </span>
        ) : null}
      </div>

      <section className="glass-panel mt-4 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">Unable to load bank references</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong while fetching your bank reference requests.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => {
                org.refetch();
                requestsQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Banknote className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No bank reference requests yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Bank reference requests created for your procurement workspace will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">No matching requests</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust your search or status filter to see more results.
            </p>
          </div>
        ) : (
          <BankReferenceTable items={filtered} />
        )}
      </section>
    </div>
  );
}
