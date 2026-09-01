/**
 * Wave counter backend (Cloudflare Worker).
 *
 * Routes:
 *   GET  /count      -> { count }
 *   POST /increment  -> { count }
 *
 * Set secrets with `wrangler secret put`:
 *   TURNSTILE_SECRET, and either NTFY_URL, or PUSHOVER_TOKEN + PUSHOVER_USER.
 *
 * ---- TUNING (edit these, then `npx wrangler deploy`) ----
 * NOTIFY_THROTTLE_MS: how often you get a push at most.
 * IP_HOURLY_LIMIT:    how many sends one IP can make per hour. Keep this
 *                     generous so shared networks (school wifi) are not blocked
 *                     by a single person's send.
 * ATTEMPT_LIMIT:      anti-hammer guard on requests per IP per minute.
 */

export interface Env {
  COUNTER: KVNamespace;
  ALLOWED_ORIGIN: string;
  TURNSTILE_SECRET?: string;
  PUSHOVER_TOKEN?: string;
  PUSHOVER_USER?: string;
  NTFY_URL?: string;
  NTFY_TOKEN?: string; // optional ntfy access token; avoids anonymous per-IP rate limits
}

const COUNT_KEY = 'count';
const NOTIFY_KEY = 'last_notify';

const NOTIFY_THROTTLE_MS = 1 * 60 * 1000; // push at most once per minute. 
const IP_HOURLY_LIMIT = 100; // max successful sends per IP per hour. Raise for shared wifi.
const ATTEMPT_WINDOW_SECONDS = 60; // window for the anti-hammer guard
const ATTEMPT_LIMIT = 30; // max /increment attempts per IP per minute

// Origins allowed to call this Worker from a browser. ALLOWED_ORIGIN is the
// canonical site; the others let you test locally.
function allowedOrigins(env: Env): string[] {
  return [
    env.ALLOWED_ORIGIN,
    'http://localhost:4321',
    'http://127.0.0.1:4321',
  ];
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allow = allowedOrigins(env).includes(origin) ? origin : env.ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data: unknown, request: Request, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
  });
}

async function verifyTurnstile(
  token: string,
  ip: string,
  env: Env,
): Promise<{ ok: boolean; codes: string[] }> {
  if (!env.TURNSTILE_SECRET) return { ok: false, codes: ['missing-server-secret'] };
  if (!token) return { ok: false, codes: ['missing-token'] };
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
  return { ok: data.success === true, codes: data['error-codes'] ?? [] };
}

async function notify(count: number, env: Env): Promise<string> {
  const last = Number((await env.COUNTER.get(NOTIFY_KEY)) || '0');
  const now = Date.now();
  if (now - last < NOTIFY_THROTTLE_MS) return 'throttled';
  await env.COUNTER.put(NOTIFY_KEY, String(now));

  const message = `Someone sent you a wave on jonathanpan.me. Count is now ${count}.`;
  try {
    if (env.PUSHOVER_TOKEN && env.PUSHOVER_USER) {
      const body = new FormData();
      body.append('token', env.PUSHOVER_TOKEN);
      body.append('user', env.PUSHOVER_USER);
      body.append('message', message);
      const r = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', body });
      return `pushover:${r.status}`;
    }
    if (env.NTFY_URL) {
      const headers: Record<string, string> = { Title: 'New wave on jonathanpan.me' };
      if (env.NTFY_TOKEN) headers.Authorization = `Bearer ${env.NTFY_TOKEN}`;
      const r = await fetch(env.NTFY_URL, { method: 'POST', body: message, headers });
      return `ntfy:${r.status}`;
    }
    return 'no-channel';
  } catch (e) {
    // Notification is best effort. Never fail the increment because of it.
    return `error:${e instanceof Error ? e.message : String(e)}`;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method === 'GET' && url.pathname === '/count') {
      const count = Number((await env.COUNTER.get(COUNT_KEY)) || '0');
      return json({ count }, request, env);
    }

    if (request.method === 'POST' && url.pathname === '/increment') {
      const ip = request.headers.get('CF-Connecting-IP') || '';
      const ipKey = ip || 'noip';

      // Anti-hammer: cap how many attempts a single IP can make per minute.
      const attKey = `att:${ipKey}`;
      const attempts = Number((await env.COUNTER.get(attKey)) || '0');
      if (attempts >= ATTEMPT_LIMIT) {
        return json({ error: 'too_many_attempts' }, request, env, 429);
      }
      await env.COUNTER.put(attKey, String(attempts + 1), {
        expirationTtl: ATTEMPT_WINDOW_SECONDS,
      });

      // Verify the Turnstile token. Error codes are returned to help debugging.
      let token = '';
      try {
        const parsed = (await request.json()) as { token?: string };
        token = parsed.token || '';
      } catch {
        token = '';
      }
      const verdict = await verifyTurnstile(token, ip, env);
      if (!verdict.ok) {
        return json({ error: 'verification_failed', codes: verdict.codes }, request, env, 403);
      }

      // Per-IP hourly cap on successful sends. Generous, so shared networks work.
      const ipcKey = `ipc:${ipKey}`;
      const used = Number((await env.COUNTER.get(ipcKey)) || '0');
      if (used >= IP_HOURLY_LIMIT) {
        return json({ error: 'rate_limited' }, request, env, 429);
      }

      // Increment. KV is not strictly atomic, which is acceptable at this volume.
      const count = Number((await env.COUNTER.get(COUNT_KEY)) || '0') + 1;
      await env.COUNTER.put(COUNT_KEY, String(count));
      await env.COUNTER.put(ipcKey, String(used + 1), { expirationTtl: 3600 });

      // Notify in the background so the response returns without waiting on it.
      ctx.waitUntil(notify(count, env));
      return json({ count }, request, env);
    }

    return json({ error: 'not_found' }, request, env, 404);
  },
};
