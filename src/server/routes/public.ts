import { Hono } from 'hono';
import type { AppServices, AppVariables } from '../context';

export function publicRoutes(services: AppServices): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get('/config', (c) => {
    return c.json({
      turnstileSiteKey: services.config.turnstileSiteKey,
      appBaseUrl: services.config.appBaseUrl,
    });
  });

  return app;
}
