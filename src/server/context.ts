import type { DailyStat, Link, LinkStatus, MagicTokenRecord, SlugRecord, User } from '@shared/types';
import type { AppConfig } from './config';
import type { RequestMetadata } from './runtime/request';

export interface Repository {
  findUserByEmail(email: string): Promise<User | null>;
  createUser(email: string): Promise<User>;
  saveMagicToken(tokenHash: string, record: MagicTokenRecord): Promise<void>;
  consumeMagicToken(tokenHash: string, nowIso: string): Promise<MagicTokenRecord | null>;
  createLink(link: Link): Promise<{ ok: boolean; reason?: 'slug_exists' }>;
  listLinks(ownerId: string): Promise<Link[]>;
  getLinkById(id: string): Promise<Link | null>;
  getSlugRecord(slug: string): Promise<SlugRecord | null>;
  updateLink(link: Link): Promise<void>;
  updateSlugStatus(slug: string, status: LinkStatus): Promise<void>;
  incrementStat(linkId: string, date: string, country: string, device: string): Promise<DailyStat>;
  getDailyStats(linkId: string, dates: string[]): Promise<DailyStat[]>;
  incrementRateLimit(date: string, scope: string, identifierHash: string): Promise<number>;
}

export interface EmailService {
  sendMagicLink(email: string, url: string): Promise<void>;
}

export interface CaptchaService {
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

export interface AppServices {
  config: AppConfig;
  repo: Repository;
  email: EmailService;
  captcha: CaptchaService;
}

export interface AppVariables {
  requestMeta: RequestMetadata;
  userId?: string;
  user?: User;
}
