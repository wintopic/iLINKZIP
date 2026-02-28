import { describe, expect, it } from 'vitest';
import { validateTargetUrl } from '../src/server/utils/validation';

describe('validateTargetUrl', () => {
  it('accepts http and https URLs', () => {
    expect(validateTargetUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(validateTargetUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejects non-http protocols', () => {
    expect(() => validateTargetUrl('javascript:alert(1)')).toThrow('Only http and https URLs are allowed');
  });

  it('rejects invalid URL strings', () => {
    expect(() => validateTargetUrl('not-a-url')).toThrow('Invalid URL format');
  });
});
