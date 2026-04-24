import { Context, Next } from 'hono';
import { getSignedCookie } from 'hono/cookie';
import { env } from '@src/env';
import { load_session } from './session-store';
import { verify_bearer_token, KeycloakClaims } from './jwt-verify';
import { ensure_user_from_claims } from './user-upsert';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { log } from './log';

const claims_only_user = (claims: KeycloakClaims) => ({
  id:                 claims.sub,
  email:              claims.email ?? '',
  name:               claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub,
  keycloak_sub:       claims.sub,
  preferred_username: claims.preferred_username,
  realm_roles:        claims.realm_access?.roles ?? [],
  source:             'bearer-claims-only',
  Role:               null,
});

const attach_source = (user: any, source: string) => { user.source = source; return user; };

const try_bearer = async (c: Context) => {
  const header = c.req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const claims   = await verify_bearer_token(token);
    const db_user  = await ensure_user_from_claims(claims);
    if (db_user) return attach_source(db_user, 'bearer-db');
    return claims_only_user(claims);
  } catch (e: any) {
    log.warn('auth.bearer.invalid', { error: String(e?.message ?? e) });
    return null;
  }
};

const try_session_cookie = async (c: Context) => {
  const sid = await getSignedCookie(c, env.SESSION_SECRET, env.SESSION_COOKIE_NAME);
  if (!sid) return null;
  const session = await load_session(sid as string);
  if (!session) return null;
  const user = await User.findByPk(session.user_id, { include: [{ model: Role }] });
  if (!user) return null;
  return attach_source(user, 'session');
};

export const auth_middleware = async (c: Context, next: Next) => {
  const bearer_user = await try_bearer(c);
  if (bearer_user) { c.set('user', bearer_user); return next(); }

  const cookie_user = await try_session_cookie(c).catch(() => null);
  if (cookie_user) { c.set('user', cookie_user); return next(); }

  c.set('user', null);
  return next();
};
