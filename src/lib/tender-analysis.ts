export interface SafeAnalysisOutput {
  hasData: boolean;
  metrics: Array<{ label: string; value: string }>;
  rawSummary?: string;
}

/**
 * Defensive presentation parser for the backend's analysis_json.
 * It intentionally makes no assumptions about future engine keys or shapes.
 */
export function parseAnalysisJson(rawJson: unknown): SafeAnalysisOutput {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    return { hasData: false, metrics: [] };
  }

  const record = rawJson as Record<string, unknown>;
  const metrics: Array<{ label: string; value: string }> = [];
  let rawSummary: string | undefined;

  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;

    const stringValue = String(value).trim();
    if (!stringValue) continue;

    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes("summary") || normalizedKey.includes("description")) {
      rawSummary = stringValue;
      continue;
    }

    const cleanLabel = key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (char) => char.toUpperCase());

    metrics.push({ label: cleanLabel, value: stringValue });
  }

  return {
    hasData: metrics.length > 0 || Boolean(rawSummary),
    metrics,
    rawSummary,
  };
}
