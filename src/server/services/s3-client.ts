import { AwsClient } from 'aws4fetch';

function encodeKey(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

interface PutOptions {
  ifNoneMatch?: string;
  ifMatch?: string;
  contentType?: string;
}

export class S3Client {
  private client: AwsClient;

  private baseUrl: string;

  constructor(options: { accessKeyId: string; secretAccessKey: string; region: string; bucket: string }) {
    this.client = new AwsClient({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      service: 's3',
      region: options.region,
    });
    this.baseUrl = `https://${options.bucket}.s3.${options.region}.amazonaws.com`;
  }

  async getJson<T>(key: string): Promise<{ data: T | null; etag?: string }> {
    const response = await this.client.fetch(`${this.baseUrl}/${encodeKey(key)}`);
    if (response.status === 404) {
      return { data: null };
    }

    if (!response.ok) {
      throw new Error(`S3 getJson failed (${response.status}) for key ${key}`);
    }

    return {
      data: (await response.json()) as T,
      etag: response.headers.get('etag') ?? undefined,
    };
  }

  async putJson(key: string, value: unknown, options: PutOptions = {}): Promise<{ ok: boolean; etag?: string }> {
    const headers: Record<string, string> = {
      'content-type': options.contentType || 'application/json',
    };

    if (options.ifNoneMatch) {
      headers['if-none-match'] = options.ifNoneMatch;
    }

    if (options.ifMatch) {
      headers['if-match'] = options.ifMatch;
    }

    const response = await this.client.fetch(`${this.baseUrl}/${encodeKey(key)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(value),
    });

    if (response.status === 412 || response.status === 409) {
      return { ok: false };
    }

    if (!response.ok) {
      throw new Error(`S3 putJson failed (${response.status}) for key ${key}`);
    }

    return {
      ok: true,
      etag: response.headers.get('etag') ?? undefined,
    };
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken = '';

    do {
      const query = new URLSearchParams({
        'list-type': '2',
        prefix,
      });
      if (continuationToken) {
        query.set('continuation-token', continuationToken);
      }

      const response = await this.client.fetch(`${this.baseUrl}/?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`S3 listKeys failed (${response.status}) for prefix ${prefix}`);
      }

      const xml = await response.text();
      const matches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
      for (const match of matches) {
        keys.push(decodeXml(match[1] || ''));
      }

      const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuationToken = truncated && tokenMatch ? decodeXml(tokenMatch[1]) : '';
    } while (continuationToken);

    return keys;
  }
}
