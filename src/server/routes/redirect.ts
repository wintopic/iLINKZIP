import { Hono } from 'hono';
import qrcode from 'qrcode-generator';
import type { AppServices, AppVariables } from '../context';
import { todayUtc } from '../utils/date';

export function redirectRoutes(services: AppServices): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get('/r/:slug', async (c) => {
    const slug = c.req.param('slug');
    if (!slug) {
      return c.text('Not Found', 404);
    }
    const slugRecord = await services.repo.getSlugRecord(slug);
    if (!slugRecord || slugRecord.status !== 'active') {
      return c.text('Not Found', 404);
    }

    const link = await services.repo.getLinkById(slugRecord.linkId);
    if (!link || link.status !== 'active') {
      return c.text('Not Found', 404);
    }

    const requestMeta = c.get('requestMeta');
    const today = todayUtc();
    services.repo
      .incrementStat(link.id, today, requestMeta.country || 'unknown', requestMeta.device || 'unknown')
      .catch((error) => {
        console.error('[iLINKZIP] incrementStat failed:', error);
      });

    return c.redirect(link.targetUrl, 302);
  });

  app.get('/q/:slug.svg', async (c) => {
    const slug = c.req.param('slug');
    if (!slug) {
      return c.text('Not Found', 404);
    }
    const slugRecord = await services.repo.getSlugRecord(slug);
    if (!slugRecord || slugRecord.status !== 'active') {
      return c.text('Not Found', 404);
    }

    const qr = qrcode(0, 'M');
    qr.addData(`${services.config.appBaseUrl}/r/${slug}`);
    qr.make();

    const svg = qr.createSvgTag({
      scalable: true,
      margin: 2,
      cellSize: 4,
    });

    c.header('content-type', 'image/svg+xml; charset=utf-8');
    c.header('cache-control', 'public, max-age=300');
    return c.body(svg);
  });

  return app;
}
