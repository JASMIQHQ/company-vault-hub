import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Search } from "lucide-react";

import { CreateBankReferenceDialog } from "@/components/bank-references/create-bank-reference-dialog";
import { BankReferenceTable } from "@/components/bank-references/bank-reference-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanies } from "@/hooks/use-companies";
import {
  useBankReferenceRequests,
  useBankReferenceTenders,
  useBankReferenceTemplateCount,
  useBankReferenceTemplates,
} from "@/hooks/use-bank-reference-requests";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";
import { effectiveStatus, isExpired } from "@/lib/bank-references";

export const Route = createFileRoute("/_authenticated/bank-references")({
  head: () => ({
    meta: [
      { title: "Bank References | Jasmiq Procurement AI" },
      {
        name: "description",
        content: "Create and manage bank reference requests and reusable templates.",
      },
      { property: "og:title", content: "Bank References | Jasmiq Procurement AI" },
      { property: "og:description", content: "Create and manage bank reference requests and reusable templates." },
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

function matches(item: Parameters<typeof effectiveStatus>[0], search: string, status: string, company: string, tender: string) {
  const term = search.trim().toLowerCase();
  if (status !== "all" && effectiveStatus(item) !== status) return false;
  if (company !== "all" && item.company_id !== company) return false;
  if (tender !== "all" && (item.tender_id ?? "none") !== tender) return false;
  if (!term) return true;
  return [item.bank_name, item.company_name, item.tender_title]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(term));
}

function BankReferencesPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const requestsQuery = useBankReferenceRequests(session, org.activeOrgId);
  const templatesQuery = useBankReferenceTemplates(session, org.activeOrgId);
  const templateCountQuery = useBankReferenceTemplateCount(session, org.activeOrgId);
  const companiesQuery = useCompanies(session, org.activeOrgId);
  const tendersQuery = useBankReferenceTenders(session, org.activeOrgId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [company, setCompany] = useState("all");
  const [tender, setTender] = useState("all");

  const requests = requestsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const companies = companiesQuery.data ?? [];
  const tenders = tendersQuery.data ?? [];

  const loading = org.bootstrapping || requestsQuery.isPending || templatesQuery.isPending || companiesQuery.isPending || tendersQuery.isPending;
  const error = org.error ?? (requestsQuery.error as Error | null) ?? (templatesQuery.error as Error | null);

  const kpis = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "draft" || r.status === "requested").length,
    processing: requests.filter((r) => r.status === "processing").length,
    received: requests.filter((r) => r.status === "received" && !isExpired(r)).length,
    expired: requests.filter(isExpired).length,
  }), [requests]);

  const filteredRequests = useMemo(
    () => requests.filter((item) => matches(item, search, status, company, tender)),
    [requests, search, status, company, tender],
  );
  const filteredTemplates = useMemo(
    () => templates.filter((item) => matches(item, search, "all", company, "all")),
    [templates, search, company],
  );

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setCompany("all");
    setTender("all");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {org.multiCompany ? (
        <div className="mb-6">
          <div className="max-w-xs">
            <label htmlFor="bank-references-organization" className="text-xs text-muted-foreground">Workspace</label>
            <select
              id="bank-references-organization"
              className="mt-1.5 h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={org.activeOrgId ?? ""}
              onChange={(event) => org.setActiveOrgId(event.target.value)}
            >
              {org.organizations.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bank References</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage bank reference requests and reusable templates.</p>
        </div>
        {org.activeOrgId ? (
          <CreateBankReferenceDialog
            organizationId={org.activeOrgId}
            companies={companies}
            tenders={tenders}
            trigger={<Button className="w-full rounded-xl sm:w-auto">New Bank Reference</Button>}
          />
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Active Requests" value={kpis.total} />
        <Kpi label="Pending" value={kpis.pending} />
        <Kpi label="Processing" value={kpis.processing} />
        <Kpi label="Received" value={kpis.received} />
        <Kpi label="Expired" value={kpis.expired} />
      </div>

      <div className="glass-panel mt-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9"
              placeholder="Search bank, company or tender"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REQUESTED">Requested</option>
            <option value="PROCESSING">Processing</option>
            <option value="RECEIVED">Received</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Filter by company">
            <option value="all">All companies</option>
            {companies.map((item) => <option key={item.id} value={item.id}>{item.legal_name}</option>)}
          </select>
          <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={tender} onChange={(e) => setTender(e.target.value)} aria-label="Filter by tender">
            <option value="all">All tenders</option>
            <option value="none">Tender independent</option>
            {tenders.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          {(search || status !== "all" || company !== "all" || tender !== "all") && (
            <Button variant="ghost" className="rounded-xl" onClick={resetFilters}>Clear</Button>
          )}
        </div>
      </div>

      <section className="glass-panel mt-6 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-12 w-full rounded-xl" />)}</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">Unable to load bank references</p>
            <p className="mt-1 text-sm text-muted-foreground">Something went wrong while fetching your bank reference data.</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { org.refetch(); requestsQuery.refetch(); templatesQuery.refetch(); }}>Retry</Button>
          </div>
        ) : (
          <div>
            <div className="border-b border-border/50 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Active Requests</h2>
                  <p className="text-xs text-muted-foreground">Operational bank reference requests only.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{filteredRequests.length}</span>
              </div>
            </div>
            {filteredRequests.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Banknote className="size-5" /></div>
                <p className="mt-4 text-sm font-medium">{requests.length === 0 ? "No bank reference requests yet" : "No matching requests"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{requests.length === 0 ? "Create your first bank reference request to begin." : "Adjust your search or filters to see more results."}</p>
              </div>
            ) : <BankReferenceTable items={filteredRequests} />}
          </div>
        )}
      </section>

      {!loading && !error ? (
        <section className="glass-panel mt-6 overflow-hidden">
          <div className="border-b border-border/50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Templates</h2>
                <p className="text-xs text-muted-foreground">Reusable configurations kept separate from active workflow tickets.</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{templateCountQuery.data ?? templates.length}</span>
            </div>
          </div>
          {filteredTemplates.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm font-medium">No templates found</p><p className="mt-1 text-sm text-muted-foreground">Create a template from the New Bank Reference flow.</p></div>
          ) : <BankReferenceTable items={filteredTemplates} />}
        </section>
      ) : null}
    </div>
  );
}
