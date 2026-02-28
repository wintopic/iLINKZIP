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
        subject: 'Your iLINKZIP sign-in link',
        html: `<p>Click to sign in:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to send magic link: ${response.status} ${body}`);
    }
  }
}
