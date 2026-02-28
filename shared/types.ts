export type LinkKind = 'short' | 'qrcode' | 'live_url';
export type LinkStatus = 'active' | 'disabled';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  id: string;
  ownerId: string;
  kind: LinkKind;
  slug: string;
  targetUrl: string;
  status: LinkStatus;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlugRecord {
  slug: string;
  linkId: string;
  ownerId: string;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MagicTokenRecord {
  id: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

export interface DailyStat {
  linkId: string;
  date: string;
  total: number;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  updatedAt: string;
}
