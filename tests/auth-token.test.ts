import { describe, expect, it } from 'vitest';
import { signSessionToken, verifySessionToken } from '../src/server/utils/crypto';

describe('session token signing', () => {
  it('verifies valid token', async () => {
    const token = await signSessionToken(
      {
        userId: 'usr_test',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      'secret-1',
    );

    const parsed = await verifySessionToken(token, 'secret-1');
    expect(parsed?.userId).toBe('usr_test');
  });

  it('rejects tampered token', async () => {
    const token = await signSessionToken(
      {
        userId: 'usr_test',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      'secret-1',
    );

    const tampered = token.replace(/.$/, 'x');
    const parsed = await verifySessionToken(tampered, 'secret-1');
    expect(parsed).toBeNull();
  });
});
