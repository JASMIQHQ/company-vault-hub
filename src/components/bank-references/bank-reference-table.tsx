import { Banknote } from "lucide-react";

import { BankReferenceStatusBadge } from "@/components/bank-references/status-badge";
import { formatDate, type BankReferenceListItem } from "@/lib/bank-references";

function CompanyLabel({ item }: { item: BankReferenceListItem }) {
  if (!item.company_id) {
    return <span className="text-muted-foreground">No company assigned</span>;
  }
  return <span>{item.company_name ?? "No company assigned"}</span>;
}

function TenderLabel({ item }: { item: BankReferenceListItem }) {
  if (!item.tender_id) {
    return <span className="text-muted-foreground">General / Tender Independent</span>;
  }
  return <span>{item.tender_title ?? "General / Tender Independent"}</span>;
}

export function BankReferenceTable({ items }: { items: BankReferenceListItem[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Bank</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Tender</th>
              <th className="px-5 py-3 font-medium">Requested</th>
              <th className="px-5 py-3 font-medium">Expected</th>
              <th className="px-5 py-3 font-medium">Received</th>
              <th className="px-5 py-3 font-medium">Expiry</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/40"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Banknote className="size-4" />
                    </div>
                    <span className="font-medium">{item.bank_name || "—"}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <CompanyLabel item={item} />
                </td>
                <td className="max-w-[16rem] truncate px-5 py-3.5">
                  <TenderLabel item={item} />
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {formatDate(item.request_date)}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {formatDate(item.expected_date)}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {formatDate(item.received_date)}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {formatDate(item.expiry_date)}
                </td>
                <td className="px-5 py-3.5">
                  <BankReferenceStatusBadge item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {items.map((item) => (
          <div key={item.id} className="border-b border-border/50 p-4 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.bank_name || "—"}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  <CompanyLabel item={item} />
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  <TenderLabel item={item} />
                </p>
              </div>
              <BankReferenceStatusBadge item={item} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Requested</dt>
                <dd>{formatDate(item.request_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expected</dt>
                <dd>{formatDate(item.expected_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Received</dt>
                <dd>{formatDate(item.received_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expiry</dt>
                <dd>{formatDate(item.expiry_date)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
