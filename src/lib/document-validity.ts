export type DocumentValidity = "valid" | "expiring_soon" | "expired";

export function getDocumentValidity(expiryDate: string | null | undefined, asOf = new Date()): DocumentValidity {
  if (!expiryDate) return "valid";
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

export function getDaysUntilExpiry(expiryDate: string | null | undefined, asOf = new Date()): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}
