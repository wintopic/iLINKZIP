import { createMiddleware } from 'hono/factory';
import { parse } from 'cookie';
import type { AppVariables } from '../context';
import type { AppConfig } from '../config';
import { verifySessionToken } from '../utils/crypto';

export function authMiddleware(config: AppConfig) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const cookieHeader = c.req.header('cookie') ?? '';
    const cookies = parse(cookieHeader || '');
    const token = cookies.ilz_session;
    if (token) {
      const payload = await verifySessionToken(token, config.sessionSecret);
      if (payload?.userId) {
        c.set('userId', payload.userId);
      }
    }

    await next();
  });
}

export function requireAuth() {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: '鏈櫥褰曟垨浼氳瘽澶辨晥 / Unauthorized' }, 401);
    }
    await next();
  });
}
