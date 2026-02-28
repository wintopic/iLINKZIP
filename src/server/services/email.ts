import type { EmailService } from '../context';

export class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  async sendMagicLink(email: string, url: string): Promise<void> {
    if (!this.apiKey) {
      console.log('[iLINKZIP] RESEND_API_KEY not set, magic link:', url);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: email,
        subject: 'iLINKZIP 登录链接 / Sign-in link',
        html: `<p><strong>中文</strong></p><p>点击下方链接登录：</p><p><a href="${url}">${url}</a></p><p>链接 15 分钟内有效。</p><hr/><p><strong>English</strong></p><p>Click the link below to sign in:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to send magic link: ${response.status} ${body}`);
    }
  }
}
