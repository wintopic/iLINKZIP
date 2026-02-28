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
        subject: 'iLINKZIP 鐧诲綍閾炬帴 / Sign-in link',
        html: `<p><strong>涓枃</strong></p><p>鐐瑰嚮涓嬫柟閾炬帴鐧诲綍锛?/p><p><a href="${url}">${url}</a></p><p>閾炬帴 15 鍒嗛挓鍐呮湁鏁堛€?/p><hr/><p><strong>English</strong></p><p>Click the link below to sign in:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to send magic link: ${response.status} ${body}`);
    }
  }
}
