export interface SafeAnalysisMetric {
  label: string;
  value: string;
}

export interface SafeAnalysisOutput {
  hasData: boolean;
  metrics: SafeAnalysisMetric[];
  rawSummary?: string;
}

function cleanLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stringifyValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/**
 * Reads future engine output without assuming a fixed analysis_json schema.
 * Rendering must remain safe for null, malformed, nested, or engine-versioned data.
 */
export function parseAnalysisJson(rawJson: unknown): SafeAnalysisOutput {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    return { hasData: false, metrics: [] };
  }

  const record = rawJson as Record<string, unknown>;
  const metrics: SafeAnalysisMetric[] = [];
  let rawSummary: string | undefined;

  for (const [key, value] of Object.entries(record)) {
    const stringValue = stringifyValue(value);
    if (stringValue === null || !stringValue.trim()) continue;

    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("summary") ||
      normalizedKey.includes("description") ||
      normalizedKey === "notes" ||
      normalizedKey === "note"
    ) {
      rawSummary = stringValue;
      continue;
    }

    metrics.push({ label: cleanLabel(key), value: stringValue });
  }

  return {
    hasData: metrics.length > 0 || Boolean(rawSummary),
    metrics,
    rawSummary,
  };
}
