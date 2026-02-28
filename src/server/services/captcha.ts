import type { CaptchaService } from '../context';

export class TurnstileCaptchaService implements CaptchaService {
  constructor(private readonly secretKey: string) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    if (!this.secretKey) {
      return true;
    }

    if (!token) {
      return false;
    }

    const payload = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });

    if (remoteIp) {
      payload.set('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  }
}
