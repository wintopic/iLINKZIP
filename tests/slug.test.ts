import { describe, expect, it } from 'vitest';
import { generateSlug, isValidSlug, sanitizeSlug } from '../src/server/utils/slug';

describe('slug utils', () => {
  it('generates valid default slug', () => {
    const slug = generateSlug();
    expect(slug.length).toBe(7);
    expect(isValidSlug(slug)).toBe(true);
  });

  it('sanitizes custom input', () => {
    expect(sanitizeSlug(' My Promo Link!! ')).toBe('my-promo-link-');
  });

  it('validates slug shape', () => {
    expect(isValidSlug('ok_123')).toBe(true);
    expect(isValidSlug('bad slug')).toBe(false);
  });
});
