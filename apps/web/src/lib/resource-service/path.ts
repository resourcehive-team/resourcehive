export function apiPathSegment(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }

  return encodeURIComponent(normalizedValue);
}
