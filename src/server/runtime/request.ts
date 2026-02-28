export interface RequestMetadata {
  ip: string;
  country: string;
  device: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  userAgent: string;
}

function inferDevice(userAgent: string): RequestMetadata['device'] {
  const ua = userAgent.toLowerCase();
  if (!ua) {
    return 'unknown';
  }

  if (/(bot|crawler|spider|slurp)/i.test(ua)) {
    return 'bot';
  }

  if (/(tablet|ipad)/i.test(ua)) {
    return 'tablet';
  }

  if (/(mobile|android|iphone)/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

function firstHeaderValue(headers: Headers, keys: string[]): string {
  for (const key of keys) {
    const value = headers.get(key);
    if (value) {
      return value.split(',')[0]?.trim() ?? '';
    }
  }

  return '';
}

export function extractRequestMetadata(request: Request): RequestMetadata {
  const userAgent = request.headers.get('user-agent') ?? '';
  return {
    ip: firstHeaderValue(request.headers, ['cf-connecting-ip', 'x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip']) || 'unknown',
    country: firstHeaderValue(request.headers, ['cf-ipcountry', 'x-vercel-ip-country']) || 'unknown',
    device: inferDevice(userAgent),
    userAgent,
  };
}
