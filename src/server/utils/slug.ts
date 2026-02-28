const SAFE_SLUG = /^[a-zA-Z0-9_-]{4,64}$/;

export function sanitizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
}

export function isValidSlug(slug: string): boolean {
  return SAFE_SLUG.test(slug);
}

export function generateSlug(length = 7): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let output = '';
  for (const byte of bytes) {
    output += alphabet[byte % alphabet.length];
  }
  return output.toLowerCase();
}
