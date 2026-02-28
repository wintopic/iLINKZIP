import type { DailyStat, Link, LinkStatus, MagicTokenRecord, SlugRecord, User } from '@shared/types';
import type { Repository } from '../context';
import { randomId, sha256Hex } from '../utils/crypto';
import { S3Client } from './s3-client';

interface OwnerIndex {
  linkId: string;
  updatedAt: string;
}

interface CounterRecord {
  count: number;
  updatedAt: string;
}

function linkKey(id: string): string {
  return `links/${id}.json`;
}

function ownerIndexKey(ownerId: string, linkId: string): string {
  return `owner/${ownerId}/links/${linkId}.json`;
}

function slugKey(slug: string): string {
  return `slug/${slug}.json`;
}

function statKey(linkId: string, date: string): string {
  return `stats/${linkId}/${date}.json`;
}

function userKey(userId: string): string {
  return `users/${userId}.json`;
}

function userByEmailKey(emailHash: string): string {
  return `users/by-email/${emailHash}.json`;
}

function tokenKey(tokenHash: string): string {
  return `auth/magic/${tokenHash}.json`;
}

function rateLimitKey(date: string, scope: string, identifierHash: string): string {
  return `ratelimit/${date}/${scope}/${identifierHash}.json`;
}

async function emailHash(email: string): Promise<string> {
  return sha256Hex(email.trim().toLowerCase());
}

export class S3Repository implements Repository {
  constructor(private readonly client: S3Client) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const hash = await emailHash(email);
    const mapping = await this.client.getJson<{ userId: string }>(userByEmailKey(hash));
    if (!mapping.data?.userId) {
      return null;
    }

    const user = await this.client.getJson<User>(userKey(mapping.data.userId));
    return user.data;
  }

  async createUser(email: string): Promise<User> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const user: User = {
      id: randomId('usr'),
      email,
      createdAt: now,
      updatedAt: now,
    };

    const hash = await emailHash(email);
    await this.client.putJson(userKey(user.id), user);
    await this.client.putJson(userByEmailKey(hash), { userId: user.id });
    return user;
  }

  async saveMagicToken(tokenHash: string, record: MagicTokenRecord): Promise<void> {
    await this.client.putJson(tokenKey(tokenHash), record);
  }

  async consumeMagicToken(tokenHash: string, nowIso: string): Promise<MagicTokenRecord | null> {
    const result = await this.client.getJson<MagicTokenRecord>(tokenKey(tokenHash));
    const record = result.data;
    if (!record) {
      return null;
    }

    if (record.usedAt) {
      return null;
    }

    if (record.expiresAt < nowIso) {
      return null;
    }

    const consumed: MagicTokenRecord = {
      ...record,
      usedAt: nowIso,
    };

    await this.client.putJson(tokenKey(tokenHash), consumed);
    return consumed;
  }

  async createLink(link: Link): Promise<{ ok: boolean; reason?: 'slug_exists' }> {
    const slugWrite = await this.client.putJson(
      slugKey(link.slug),
      {
        slug: link.slug,
        linkId: link.id,
        ownerId: link.ownerId,
        status: link.status,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      } satisfies SlugRecord,
      { ifNoneMatch: '*' },
    );

    if (!slugWrite.ok) {
      return { ok: false, reason: 'slug_exists' };
    }

    await this.client.putJson(linkKey(link.id), link);
    await this.client.putJson(ownerIndexKey(link.ownerId, link.id), {
      linkId: link.id,
      updatedAt: link.updatedAt,
    } satisfies OwnerIndex);

    return { ok: true };
  }

  async listLinks(ownerId: string): Promise<Link[]> {
    const keys = await this.client.listKeys(`owner/${ownerId}/links/`);
    const linkIds = keys
      .map((key) => key.split('/').pop() || '')
      .map((fileName) => fileName.replace(/\.json$/, ''))
      .filter(Boolean);

    const links = await Promise.all(linkIds.map(async (id) => (await this.client.getJson<Link>(linkKey(id))).data));

    return links
      .filter((link): link is Link => Boolean(link))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getLinkById(id: string): Promise<Link | null> {
    const result = await this.client.getJson<Link>(linkKey(id));
    return result.data;
  }

  async getSlugRecord(slug: string): Promise<SlugRecord | null> {
    const result = await this.client.getJson<SlugRecord>(slugKey(slug));
    return result.data;
  }

  async updateLink(link: Link): Promise<void> {
    await this.client.putJson(linkKey(link.id), link);
    await this.client.putJson(ownerIndexKey(link.ownerId, link.id), {
      linkId: link.id,
      updatedAt: link.updatedAt,
    } satisfies OwnerIndex);
    await this.updateSlugStatus(link.slug, link.status);
  }

  async updateSlugStatus(slug: string, status: LinkStatus): Promise<void> {
    const current = await this.client.getJson<SlugRecord>(slugKey(slug));
    if (!current.data) {
      return;
    }

    await this.client.putJson(slugKey(slug), {
      ...current.data,
      status,
      updatedAt: new Date().toISOString(),
    } satisfies SlugRecord);
  }

  async incrementStat(linkId: string, date: string, country: string, device: string): Promise<DailyStat> {
    const key = statKey(linkId, date);
    const current = await this.client.getJson<DailyStat>(key);

    const next: DailyStat = current.data ?? {
      linkId,
      date,
      total: 0,
      byCountry: {},
      byDevice: {},
      updatedAt: new Date().toISOString(),
    };

    next.total += 1;
    next.byCountry[country] = (next.byCountry[country] ?? 0) + 1;
    next.byDevice[device] = (next.byDevice[device] ?? 0) + 1;
    next.updatedAt = new Date().toISOString();

    await this.client.putJson(key, next);
    return next;
  }

  async getDailyStats(linkId: string, dates: string[]): Promise<DailyStat[]> {
    const stats = await Promise.all(
      dates.map(async (date) => (await this.client.getJson<DailyStat>(statKey(linkId, date))).data),
    );

    return stats.filter((entry): entry is DailyStat => Boolean(entry));
  }

  async incrementRateLimit(date: string, scope: string, identifierHash: string): Promise<number> {
    const key = rateLimitKey(date, scope, identifierHash);
    const current = await this.client.getJson<CounterRecord>(key);
    const next: CounterRecord = {
      count: (current.data?.count ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.client.putJson(key, next);
    return next.count;
  }
}

export class MemoryRepository implements Repository {
  private users = new Map<string, User>();

  private usersByEmail = new Map<string, string>();

  private tokens = new Map<string, MagicTokenRecord>();

  private links = new Map<string, Link>();

  private slugs = new Map<string, SlugRecord>();

  private ownerLinkIds = new Map<string, Set<string>>();

  private stats = new Map<string, DailyStat>();

  private limits = new Map<string, number>();

  async findUserByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const userId = this.usersByEmail.get(normalized);
    if (!userId) {
      return null;
    }

    return this.users.get(userId) ?? null;
  }

  async createUser(email: string): Promise<User> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const user: User = {
      id: randomId('usr'),
      email,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(email.trim().toLowerCase(), user.id);
    return user;
  }

  async saveMagicToken(tokenHash: string, record: MagicTokenRecord): Promise<void> {
    this.tokens.set(tokenHash, record);
  }

  async consumeMagicToken(tokenHash: string, nowIso: string): Promise<MagicTokenRecord | null> {
    const record = this.tokens.get(tokenHash);
    if (!record || record.usedAt || record.expiresAt < nowIso) {
      return null;
    }

    const consumed: MagicTokenRecord = {
      ...record,
      usedAt: nowIso,
    };

    this.tokens.set(tokenHash, consumed);
    return consumed;
  }

  async createLink(link: Link): Promise<{ ok: boolean; reason?: 'slug_exists' }> {
    if (this.slugs.has(link.slug)) {
      return { ok: false, reason: 'slug_exists' };
    }

    this.links.set(link.id, link);
    this.slugs.set(link.slug, {
      slug: link.slug,
      linkId: link.id,
      ownerId: link.ownerId,
      status: link.status,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    });

    const ownerSet = this.ownerLinkIds.get(link.ownerId) ?? new Set<string>();
    ownerSet.add(link.id);
    this.ownerLinkIds.set(link.ownerId, ownerSet);

    return { ok: true };
  }

  async listLinks(ownerId: string): Promise<Link[]> {
    const ids = Array.from(this.ownerLinkIds.get(ownerId) ?? []);
    return ids
      .map((id) => this.links.get(id))
      .filter((link): link is Link => Boolean(link))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getLinkById(id: string): Promise<Link | null> {
    return this.links.get(id) ?? null;
  }

  async getSlugRecord(slug: string): Promise<SlugRecord | null> {
    return this.slugs.get(slug) ?? null;
  }

  async updateLink(link: Link): Promise<void> {
    this.links.set(link.id, link);
    const currentSlug = this.slugs.get(link.slug);
    if (currentSlug) {
      this.slugs.set(link.slug, {
        ...currentSlug,
        status: link.status,
        updatedAt: link.updatedAt,
      });
    }
  }

  async updateSlugStatus(slug: string, status: LinkStatus): Promise<void> {
    const record = this.slugs.get(slug);
    if (!record) {
      return;
    }
    this.slugs.set(slug, { ...record, status, updatedAt: new Date().toISOString() });
  }

  async incrementStat(linkId: string, date: string, country: string, device: string): Promise<DailyStat> {
    const key = `${linkId}:${date}`;
    const current = this.stats.get(key) ?? {
      linkId,
      date,
      total: 0,
      byCountry: {},
      byDevice: {},
      updatedAt: new Date().toISOString(),
    };

    current.total += 1;
    current.byCountry[country] = (current.byCountry[country] ?? 0) + 1;
    current.byDevice[device] = (current.byDevice[device] ?? 0) + 1;
    current.updatedAt = new Date().toISOString();

    this.stats.set(key, current);
    return current;
  }

  async getDailyStats(linkId: string, dates: string[]): Promise<DailyStat[]> {
    return dates
      .map((date) => this.stats.get(`${linkId}:${date}`))
      .filter((entry): entry is DailyStat => Boolean(entry));
  }

  async incrementRateLimit(date: string, scope: string, identifierHash: string): Promise<number> {
    const key = `${date}:${scope}:${identifierHash}`;
    const count = (this.limits.get(key) ?? 0) + 1;
    this.limits.set(key, count);
    return count;
  }
}
