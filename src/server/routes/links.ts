import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Link } from '@shared/types';
import type { AppServices, AppVariables } from '../context';
import { requireAuth } from '../middleware/auth';
import { lastNDates } from '../utils/date';
import { randomId } from '../utils/crypto';
import { generateSlug, isValidSlug, sanitizeSlug } from '../utils/slug';
import { validateTargetUrl } from '../utils/validation';
import { checkRateLimit } from '../services/rate-limit';

const createLinkSchema = z.object({
  kind: z.enum(['short', 'qrcode', 'live_url']),
  slug: z.string().min(4).max(64).optional(),
  targetUrl: z.string().min(1),
  title: z.string().max(120).optional(),
  turnstileToken: z.string().min(1).optional(),
});

const updateLinkSchema = z.object({
  targetUrl: z.string().min(1).optional(),
  title: z.string().max(120).nullable().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

export function linksRoutes(services: AppServices): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use('*', requireAuth());

  app.get('/', async (c) => {
    const userId = c.get('userId')!;
    const links = await services.repo.listLinks(userId);
    return c.json({ links });
  });

  app.post('/', zValidator('json', createLinkSchema), async (c) => {
    const userId = c.get('userId')!;
    const requestMeta = c.get('requestMeta');
    const body = c.req.valid('json');

    const rate = await checkRateLimit({
      repo: services.repo,
      scope: 'create_link',
      identifier: `${userId}:${requestMeta.ip}`,
      limit: 500,
    });
    if (!rate.allowed) {
      return c.json({ error: '已达到当日创建上限 / Daily creation limit reached' }, 429);
    }

    if (services.config.turnstileSecretKey) {
      const captchaPassed = await services.captcha.verify(body.turnstileToken ?? '', requestMeta.ip);
      if (!captchaPassed) {
        return c.json({ error: '验证码校验失败 / Captcha verification failed' }, 400);
      }
    }

    let slug = body.slug ? sanitizeSlug(body.slug) : generateSlug(7);
    if (!isValidSlug(slug)) {
      return c.json({ error: '短码格式无效 / Invalid slug format' }, 400);
    }

    const now = new Date().toISOString();
    const link: Link = {
      id: randomId('lnk'),
      ownerId: userId,
      kind: body.kind,
      slug,
      targetUrl: validateTargetUrl(body.targetUrl),
      status: 'active',
      title: body.title?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await services.repo.createLink(link);
    if (!result.ok && result.reason === 'slug_exists' && !body.slug) {
      for (let i = 0; i < 3; i += 1) {
        slug = generateSlug(7);
        const retried = await services.repo.createLink({ ...link, slug });
        if (retried.ok) {
          return c.json({ link: { ...link, slug } }, 201);
        }
      }
    }

    if (!result.ok) {
      return c.json({ error: '短码已存在 / Slug already exists' }, 409);
    }

    return c.json({ link }, 201);
  });

  app.get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const link = await services.repo.getLinkById(id);
    if (!link || link.ownerId !== userId) {
      return c.json({ error: '未找到资源 / Not found' }, 404);
    }

    return c.json({ link });
  });

  app.patch('/:id', zValidator('json', updateLinkSchema), async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const existing = await services.repo.getLinkById(id);

    if (!existing || existing.ownerId !== userId) {
      return c.json({ error: '未找到资源 / Not found' }, 404);
    }

    const updated: Link = {
      ...existing,
      targetUrl: body.targetUrl ? validateTargetUrl(body.targetUrl) : existing.targetUrl,
      title: body.title === null ? undefined : body.title ?? existing.title,
      status: body.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };

    await services.repo.updateLink(updated);
    return c.json({ link: updated });
  });

  app.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const existing = await services.repo.getLinkById(id);

    if (!existing || existing.ownerId !== userId) {
      return c.json({ error: '未找到资源 / Not found' }, 404);
    }

    const updated: Link = {
      ...existing,
      status: 'disabled',
      updatedAt: new Date().toISOString(),
    };

    await services.repo.updateLink(updated);
    return c.json({ link: updated });
  });

  app.get('/:id/stats', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const range = c.req.query('range') || '7d';
    if (range !== '7d') {
      return c.json({ error: 'MVP 仅支持 7d 统计范围 / Only 7d range is supported in MVP' }, 400);
    }

    const link = await services.repo.getLinkById(id);
    if (!link || link.ownerId !== userId) {
      return c.json({ error: '未找到资源 / Not found' }, 404);
    }

    const dates = lastNDates(7);
    const stats = await services.repo.getDailyStats(id, dates);

    const points = dates.map((date) => {
      const found = stats.find((item) => item.date === date);
      return { date, total: found?.total ?? 0 };
    });

    const total = points.reduce((acc, point) => acc + point.total, 0);

    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};

    for (const stat of stats) {
      for (const [country, count] of Object.entries(stat.byCountry)) {
        byCountry[country] = (byCountry[country] ?? 0) + count;
      }
      for (const [device, count] of Object.entries(stat.byDevice)) {
        byDevice[device] = (byDevice[device] ?? 0) + count;
      }
    }

    return c.json({
      stats: {
        total,
        trend: points,
        points,
        byCountry,
        byDevice,
      },
    });
  });

  return app;
}
