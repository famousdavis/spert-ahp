/**
 * Split a bulk-paste textarea into a normalized list of email addresses.
 * Accepts commas, semicolons, and any whitespace (including newlines) as
 * separators. Lowercases, trims, and de-duplicates while preserving the
 * caller's original ordering.
 */
export function parseBulkEmails(raw: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const e = part.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}
