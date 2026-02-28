import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { serialize } from 'cookie';
import type { AppServices, AppVariables } from '../context';
import { checkRateLimit } from '../services/rate-limit';
import { normalizeEmail } from '../utils/validation';
import { randomToken, sha256Hex, signSessionToken } from '../utils/crypto';

const requestMagicSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1),
});

export function authRoutes(services: AppServices): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get('/me', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ authenticated: false }, 401);
    }

    const links = await services.repo.listLinks(userId);
    return c.json({ authenticated: true, userId, linkCount: links.length });
  });

  app.post('/request-magic-link', zValidator('json', requestMagicSchema), async (c) => {
    const body = c.req.valid('json');
    const email = normalizeEmail(body.email);
    const requestMeta = c.get('requestMeta');

    const rate = await checkRateLimit({
      repo: services.repo,
      scope: 'auth_request_magic',
      identifier: requestMeta.ip,
      limit: 30,
    });

    if (!rate.allowed) {
      return c.json({ error: '请求过于频繁 / Too many requests' }, 429);
    }

    const captchaPassed = await services.captcha.verify(body.turnstileToken, requestMeta.ip);
    if (!captchaPassed) {
      return c.json({ error: '验证码校验失败 / Captcha verification failed' }, 400);
    }

    const user = (await services.repo.findUserByEmail(email)) ?? (await services.repo.createUser(email));
    const rawToken = randomToken(32);
    const tokenHash = await sha256Hex(`${rawToken}:${services.config.magicLinkSecret}`);
    const now = new Date();
    const expires = new Date(now.getTime() + services.config.magicLinkTtlMinutes * 60 * 1000);

    await services.repo.saveMagicToken(tokenHash, {
      id: tokenHash,
      userId: user.id,
      email,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    });

    const callbackUrl = `${services.config.appBaseUrl}/api/v1/auth/callback?token=${encodeURIComponent(rawToken)}`;
    await services.email.sendMagicLink(email, callbackUrl);

    return c.json({ ok: true });
  });

  app.get('/callback', async (c) => {
    const token = c.req.query('token');
    if (!token) {
      return c.redirect('/login?error=missing_token', 302);
    }

    const tokenHash = await sha256Hex(`${token}:${services.config.magicLinkSecret}`);
    const nowIso = new Date().toISOString();
    const record = await services.repo.consumeMagicToken(tokenHash, nowIso);

    if (!record) {
      return c.redirect('/login?error=invalid_or_expired', 302);
    }

    const expiresAt = Math.floor((Date.now() + services.config.sessionTtlHours * 60 * 60 * 1000) / 1000);
    const sessionToken = await signSessionToken({ userId: record.userId, exp: expiresAt }, services.config.sessionSecret);
    const cookie = serialize('ilz_session', sessionToken, {
      httpOnly: true,
      secure: services.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: services.config.sessionTtlHours * 60 * 60,
    });

    c.header('set-cookie', cookie);
    return c.redirect('/dashboard', 302);
  });

  app.post('/logout', async (c) => {
    const cookie = serialize('ilz_session', '', {
      httpOnly: true,
      secure: services.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    c.header('set-cookie', cookie);
    return c.json({ ok: true });
  });

  return app;
}
