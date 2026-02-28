import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app';
import { loadConfig } from '../src/server/config';
import { MemoryRepository } from '../src/server/services/repository';

class StubEmailService {
  public lastMagicUrl = '';

  async sendMagicLink(_email: string, url: string): Promise<void> {
    this.lastMagicUrl = url;
  }
}

class PassCaptcha {
  async verify(): Promise<boolean> {
    return true;
  }
}

describe('integration flow', () => {
  it('handles auth + create link + redirect + stats', async () => {
    const repo = new MemoryRepository();
    const email = new StubEmailService();

    const app = createApp({
      config: loadConfig({
        APP_BASE_URL: 'http://localhost:4321',
        SESSION_SECRET: 'session-secret',
        MAGIC_LINK_SECRET: 'magic-secret',
      }),
      repo,
      email,
      captcha: new PassCaptcha(),
    });

    const reqMagic = await app.request('http://localhost/api/v1/auth/request-magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'hello@example.com',
        turnstileToken: 'token',
      }),
    });

    expect(reqMagic.status).toBe(200);
    expect(email.lastMagicUrl).toContain('/api/v1/auth/callback?token=');

    const callback = new URL(email.lastMagicUrl);
    const callbackRes = await app.request(callback.toString(), {
      redirect: 'manual',
    });

    expect(callbackRes.status).toBe(302);
    const cookie = callbackRes.headers.get('set-cookie');
    expect(cookie).toContain('ilz_session=');

    const createRes = await app.request('http://localhost/api/v1/links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookie || '',
      },
      body: JSON.stringify({
        kind: 'short',
        targetUrl: 'https://example.com/offer',
      }),
    });

    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    const link = createdBody.link as { id: string; slug: string };

    const redirectRes = await app.request(`http://localhost/api/v1/r/${link.slug}`, {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone)',
        'cf-ipcountry': 'US',
      },
      redirect: 'manual',
    });
    expect(redirectRes.status).toBe(302);

    const statsRes = await app.request(`http://localhost/api/v1/links/${link.id}/stats?range=7d`, {
      headers: {
        cookie: cookie || '',
      },
    });

    expect(statsRes.status).toBe(200);
    const statsBody = await statsRes.json();
    expect(statsBody.stats.total).toBe(1);
    expect(statsBody.stats.byCountry.US).toBe(1);
    expect(statsBody.stats.byDevice.mobile).toBe(1);
  });
});
