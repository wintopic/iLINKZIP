import { Hono } from 'hono';
import type { AppServices, AppVariables } from './context';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { linksRoutes } from './routes/links';
import { publicRoutes } from './routes/public';
import { redirectRoutes } from './routes/redirect';
import { extractRequestMetadata } from './runtime/request';

export function createApp(services: AppServices): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use('*', async (c, next) => {
    c.set('requestMeta', extractRequestMetadata(c.req.raw));
    await next();
  });

  app.use('*', authMiddleware(services.config));

  app.get('/healthz', (c) => {
    return c.json({ status: 'ok' });
  });

  app.route('/api/v1/public', publicRoutes(services));
  app.route('/api/v1/auth', authRoutes(services));
  app.route('/api/v1/links', linksRoutes(services));
  app.route('/api/v1', redirectRoutes(services));

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  app.onError((error, c) => {
    console.error('[iLINKZIP] unhandled error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
