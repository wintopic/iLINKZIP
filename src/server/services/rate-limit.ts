import type { Repository } from '../context';
import { todayUtc } from '../utils/date';
import { sha256Hex } from '../utils/crypto';

export async function checkRateLimit(options: {
  repo: Repository;
  scope: string;
  identifier: string;
  limit: number;
}): Promise<{ allowed: boolean; count: number }> {
  const date = todayUtc();
  const hash = await sha256Hex(options.identifier);
  const count = await options.repo.incrementRateLimit(date, options.scope, hash);
  return {
    allowed: count <= options.limit,
    count,
  };
}
