/** Canonical, database-facing shape of bank_reference_requests.request_metadata. */
export interface BankReferenceMetadata {
  recipient_title?: string;
  recipient_organization?: string;
  recipient_address?: string;
  project_title?: string;
  lot_number?: string;
  facility_amount?: number;
  currency?: string;
  purpose?: string;
  authorized_signatory?: string;
}

export interface BankReferenceListItem {
  id: string;
  bank_name: string | null;
  status: string | null;
  request_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string | null;
  is_template: boolean;
  company_id: string | null;
  company_name: string | null;
  tender_id: string | null;
  tender_title: string | null;
  request_metadata: BankReferenceMetadata;
}

export type EffectiveStatus = "TEMPLATE" | "EXPIRED" | string;

/** Display-only status. Never written back to the database. */
export function effectiveStatus(item: BankReferenceListItem): EffectiveStatus {
  if (item.is_template) return "TEMPLATE";
  if (item.status === "received" && item.expiry_date) {
    const expiry = new Date(item.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(expiry.getTime()) && expiry < today) return "EXPIRED";
  }
  return (item.status ?? "unknown").toUpperCase();
}

export function isExpired(item: BankReferenceListItem): boolean {
  return !item.is_template && effectiveStatus(item) === "EXPIRED";
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
