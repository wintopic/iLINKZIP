export function validateTargetUrl(urlText: string): string {
  let url: URL;
  try {
    url = new URL(urlText.trim());
  } catch {
    throw new Error('Invalid URL format');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }

  return url.toString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function ensureNonEmpty(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}
