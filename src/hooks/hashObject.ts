function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort());
  }
  return value;
}

export async function hashObject(obj: Record<string, unknown>): Promise<string> {
  const sorted = JSON.stringify(obj, sortKeysReplacer);
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sorted),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
