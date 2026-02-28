import { buildApp } from '../src/server/runtime/app-factory';

const env = typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {};
const app = buildApp(env);

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request);
}
