import type { TenderListItem } from "@/lib/tenders";
import type { CompanyDocument } from "@/lib/vault";

export type Urgency = "high" | "medium" | "low";
type DocumentStatus = CompanyDocument["document_status"];

export interface DashboardDocument {
  id: string;
  document_name: string;
  document_status: DocumentStatus;
  expiry_date: string | null;
}

export interface Mission {
  id: string;
  urgency: Urgency;
  title: string;
  detail: string;
  deadline?: string | null;
  action: { label: string; to: "/vault" | "/tenders" };
}

export interface RequirementStatusCount {
  tender_id: string;
  status: string | null;
}

export const EXPIRY_WARNING_DAYS = 30;
export const DEADLINE_LOOKAHEAD_DAYS = 60;
export const OVERDUE_DEADLINE_GRACE_DAYS = 7;

export function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function expiryState(document: Pick<DashboardDocument, "document_status" | "expiry_date">): "expired" | "expiring" | "valid" | null {
  if (document.document_status === "expired") return "expired";
  const days = daysUntil(document.expiry_date);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "expiring";
  return "valid";
}

export function formatRemaining(value: string | null): string | null {
  const days = daysUntil(value);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day remaining";
  return `${days} days remaining`;
}

export interface ReadinessSummary {
  activeDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  activeTenders: number;
  tenderReadiness: number | null;
  requirementsVerified: number;
  requirementsTotal: number;
}

export function buildReadiness(documents: DashboardDocument[], tenders: TenderListItem[], requirements: RequirementStatusCount[]): ReadinessSummary {
  const expired = documents.filter((doc) => expiryState(doc) === "expired").length;
  const expiring = documents.filter((doc) => expiryState(doc) === "expiring").length;
  const scored = tenders.filter((tender) => tender.analysis_status === "analyzed").map((tender) => tender.compliance_percentage).filter((value): value is number => typeof value === "number");
  return {
    activeDocuments: documents.length - expired,
    expiringDocuments: expiring,
    expiredDocuments: expired,
    activeTenders: tenders.filter((tender) => tender.analysis_status !== "failed").length,
    tenderReadiness: scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : null,
    requirementsVerified: requirements.filter((row) => row.status === "matched").length,
    requirementsTotal: requirements.length,
  };
}

export function buildMissions(documents: DashboardDocument[], tenders: TenderListItem[], requirements: RequirementStatusCount[]): Mission[] {
  const missions: Mission[] = [];
  for (const doc of documents) {
    const state = expiryState(doc);
    if (state === "expired") {
      missions.push({ id: `doc-expired-${doc.id}`, urgency: "high", title: `Replace ${doc.document_name}`, detail: "This document is expired and can disqualify a submission.", deadline: doc.expiry_date, action: { label: "Open Company Vault", to: "/vault" } });
    } else if (state === "expiring") {
      missions.push({ id: `doc-expiring-${doc.id}`, urgency: "medium", title: `Renew ${doc.document_name}`, detail: "Expiring within 30 days — renew before your next submission.", deadline: doc.expiry_date, action: { label: "Open Company Vault", to: "/vault" } });
    }
  }

  for (const tender of tenders) {
    const status = tender.analysis_status ?? "pending";
    const label = tender.procuring_entity ?? tender.title;
    if (status === "failed") {
      missions.push({ id: `tender-failed-${tender.id}`, urgency: "high", title: "Retry tender analysis", detail: `${label} — analysis did not complete.`, deadline: tender.submission_deadline, action: { label: "Open Tender Command", to: "/tenders" } });
    } else if (status !== "analyzed" && status !== "processing") {
      missions.push({ id: `tender-analyze-${tender.id}`, urgency: "medium", title: "Analyze tender", detail: `${label} — requirements have not been extracted yet.`, deadline: tender.submission_deadline, action: { label: "Open Tender Command", to: "/tenders" } });
    }

    const rows = requirements.filter((row) => row.tender_id === tender.id);
    const missing = rows.filter((row) => row.status === "missing").length;
    const expiredReq = rows.filter((row) => row.status === "expired").length;
    const review = rows.filter((row) => row.status === "manual_review" || row.status === "pending").length;
    if (missing + expiredReq > 0) {
      missions.push({ id: `tender-gaps-${tender.id}`, urgency: "high", title: "Close tender requirement gaps", detail: `${label} — ${missing} missing and ${expiredReq} expired requirement${missing + expiredReq === 1 ? "" : "s"}.`, deadline: tender.submission_deadline, action: { label: "Review Tender", to: "/tenders" } });
    }
    if (review > 0) {
      missions.push({ id: `tender-review-${tender.id}`, urgency: "medium", title: "Review tender requirements", detail: `${label} — ${review} requirement${review === 1 ? "" : "s"} need human verification.`, deadline: tender.submission_deadline, action: { label: "Review Tender", to: "/tenders" } });
    }
    const specific: string[] = [];
    if (tender.requires_bank_reference) specific.push("Bank reference");
    if (tender.requires_affidavit) specific.push("Sworn affidavit");
    if (tender.requires_bid_security) specific.push("Bid security");
    if (specific.length > 0) missions.push({ id: `tender-specific-${tender.id}`, urgency: "medium", title: "Prepare tender-specific documents", detail: `${label} requires: ${specific.join(", ")}. These must be obtained for this tender.`, deadline: tender.submission_deadline, action: { label: "Open Tender Command", to: "/tenders" } });
  }

  const order: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };
  return missions.sort((a, b) => {
    if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
    const aDays = daysUntil(a.deadline ?? null);
    const bDays = daysUntil(b.deadline ?? null);
    if (aDays === null) return 1;
    if (bDays === null) return -1;
    return aDays - bDays;
  }).slice(0, 5);
}

export interface DeadlineItem {
  id: string;
  title: string;
  entity: string | null;
  deadline: string;
  remaining: string;
  urgency: Urgency;
}

export function buildDeadlines(tenders: TenderListItem[]): DeadlineItem[] {
  return tenders.filter((tender) => Boolean(tender.submission_deadline)).map((tender) => {
    const days = daysUntil(tender.submission_deadline) ?? 0;
    return {
      id: tender.id,
      title: tender.title,
      entity: tender.procuring_entity,
      deadline: tender.submission_deadline!,
      remaining: formatRemaining(tender.submission_deadline) ?? "",
      urgency: (days < 0 || days <= 30 ? "high" : days <= 60 ? "medium" : "low") as Urgency,
    };
  }).filter((item) => {
    const days = daysUntil(item.deadline) ?? 0;
    return days >= -OVERDUE_DEADLINE_GRACE_DAYS && days <= DEADLINE_LOOKAHEAD_DAYS;
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 3);
}
