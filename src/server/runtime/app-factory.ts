import { createApp } from '../app';
import { loadConfig } from '../config';
import { TurnstileCaptchaService } from '../services/captcha';
import { ResendEmailService } from '../services/email';
import { MemoryRepository, S3Repository } from '../services/repository';
import { S3Client } from '../services/s3-client';

export type RuntimeEnv = Record<string, string | undefined>;

export function buildApp(env: RuntimeEnv) {
  const config = loadConfig(env);

  const repo = config.s3Bucket && config.awsAccessKeyId && config.awsSecretAccessKey
    ? new S3Repository(
        new S3Client({
          bucket: config.s3Bucket,
          region: config.s3Region,
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        }),
      )
    : new MemoryRepository();

  const services = {
    config,
    repo,
    email: new ResendEmailService(config.resendApiKey, config.resendFromEmail),
    captcha: new TurnstileCaptchaService(config.turnstileSecretKey),
  };

  return createApp(services);
}
