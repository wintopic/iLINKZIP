import { buildApp } from '../../src/server/runtime/app-factory';

let app: ReturnType<typeof buildApp> | null = null;

function toEnv(bindings: Record<string, unknown>): Record<string, string | undefined> {
  const output: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(bindings)) {
    if (typeof value === 'string') {
      output[key] = value;
    }
  }
  return output;
}

export async function onRequest(context: { request: Request; env: Record<string, unknown> }): Promise<Response> {
  if (!app) {
    app = buildApp(toEnv(context.env));
  }

  return app.fetch(context.request);
}
