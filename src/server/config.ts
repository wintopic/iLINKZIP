export interface AppConfig {
  appBaseUrl: string;
  sessionSecret: string;
  magicLinkSecret: string;
  resendApiKey: string;
  resendFromEmail: string;
  s3Bucket: string;
  s3Region: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  cookieSecure: boolean;
  sessionTtlHours: number;
  magicLinkTtlMinutes: number;
}

export type EnvInput = Record<string, string | undefined>;

export function loadConfig(env: EnvInput): AppConfig {
  const appBaseUrl = env.APP_BASE_URL || 'http://localhost:4321';
  const sessionSecret = env.SESSION_SECRET || 'dev-session-secret-change-me';
  const magicLinkSecret = env.MAGIC_LINK_SECRET || 'dev-magic-secret-change-me';

  return {
    appBaseUrl,
    sessionSecret,
    magicLinkSecret,
    resendApiKey: env.RESEND_API_KEY || '',
    resendFromEmail: env.RESEND_FROM_EMAIL || 'no-reply@example.com',
    s3Bucket: env.S3_BUCKET || '',
    s3Region: env.S3_REGION || 'us-east-1',
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID || '',
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY || '',
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : appBaseUrl.startsWith('https://'),
    sessionTtlHours: 24 * 14,
    magicLinkTtlMinutes: 15,
  };
}
