import { Context } from 'hono';
import { setCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import { ApiDetails, CookieSpec } from './api.interface';
import { get_trace_id } from '@setup/trace-context';
import { env } from '@src/env';

const apply_cookie = async (c: Context, cookie: CookieSpec) => {
  if (cookie.options?.clear) return deleteCookie(c, cookie.name, { path: cookie.options.path ?? '/' });
  const options = {
    httpOnly: cookie.options?.httpOnly ?? true,
    secure:   cookie.options?.secure   ?? env.NODE_ENV === 'production',
    sameSite: cookie.options?.sameSite ?? 'Lax',
    maxAge:   cookie.options?.maxAge,
    path:     cookie.options?.path ?? '/',
  };
  if (cookie.signed) await setSignedCookie(c, cookie.name, cookie.value, env.SESSION_SECRET, options);
  else               setCookie(c, cookie.name, cookie.value, options);
};

const apply_extras = async (c: Context, body: any) => {
  const headers: Record<string, string> | undefined = body?.headers;
  if (headers) for (const [k, v] of Object.entries(headers)) c.header(k, v);
  const cookies: CookieSpec[] | undefined = body?.cookies;
  if (cookies) for (const cookie of cookies) await apply_cookie(c, cookie);
};

export const send_response = async (c: Context, body: any, code: number, _details: ApiDetails) => {
  c.header('X-Trace-Id', get_trace_id());
  await apply_extras(c, body);
  if (code === 302 && typeof body?.message === 'string') return c.redirect(body.message, 302);
  return c.json(body, code as any);
};
