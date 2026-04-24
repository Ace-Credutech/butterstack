import axios from 'axios';
import { env, keycloak_issuer } from '@src/env';
import { log } from './log';

export type TokenSet = {
  access_token:      string;
  refresh_token:     string;
  expires_in:        number;
  refresh_expires_in: number;
  token_type:        string;
  id_token?:         string;
  scope?:            string;
};

const ensure_kc_configured = () => {
  const issuer = keycloak_issuer();
  if (!issuer) throw { code: 500, message: 'Keycloak not configured (KEYCLOAK_URL + KEYCLOAK_REALM required)' };
  if (!env.KEYCLOAK_CLIENT_ID) throw { code: 500, message: 'KEYCLOAK_CLIENT_ID not set' };
  return issuer;
};

const post_form = async (url: string, form: Record<string, string>): Promise<any> => {
  const body = new URLSearchParams(form).toString();
  const res  = await axios.post(url, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, validateStatus: () => true });
  return res;
};

const translate_kc_error = (res: any, default_message: string): any => {
  const data = res.data;
  const msg  = data?.error_description ?? data?.errorMessage ?? data?.error ?? default_message;
  const code = res.status === 401 ? 401 : res.status === 409 ? 409 : res.status === 400 ? 400 : 500;
  return { code, message: msg, details: data };
};

export const kc_password_login = async (username: string, password: string): Promise<TokenSet> => {
  const issuer = ensure_kc_configured();
  const res    = await post_form(`${issuer}/protocol/openid-connect/token`, {
    grant_type: 'password',
    client_id:  env.KEYCLOAK_CLIENT_ID!,
    username,
    password,
    scope:      'openid profile email',
  });
  if (res.status !== 200) throw translate_kc_error(res, 'Login failed');
  return res.data as TokenSet;
};

export const kc_refresh_token = async (refresh_token: string): Promise<TokenSet> => {
  const issuer = ensure_kc_configured();
  const res    = await post_form(`${issuer}/protocol/openid-connect/token`, {
    grant_type: 'refresh_token',
    client_id:  env.KEYCLOAK_CLIENT_ID!,
    refresh_token,
  });
  if (res.status !== 200) throw translate_kc_error(res, 'Token refresh failed');
  return res.data as TokenSet;
};

export const kc_logout = async (refresh_token: string): Promise<void> => {
  const issuer = ensure_kc_configured();
  const res    = await post_form(`${issuer}/protocol/openid-connect/logout`, {
    client_id:  env.KEYCLOAK_CLIENT_ID!,
    refresh_token,
  });
  if (res.status >= 400) log.warn('keycloak.logout.soft_fail', { status: res.status, body: res.data });
};

let cached_admin_token: { token: string; expires_at: number } | null = null;

const fetch_admin_token = async (): Promise<string> => {
  if (!env.KEYCLOAK_URL)                 throw { code: 500, message: 'KEYCLOAK_URL not set' };
  if (!env.KEYCLOAK_ADMIN_REALM)         throw { code: 500, message: 'KEYCLOAK_ADMIN_REALM not set' };
  if (!env.KEYCLOAK_ADMIN_CLIENT_ID)     throw { code: 500, message: 'KEYCLOAK_ADMIN_CLIENT_ID not set' };
  if (!env.KEYCLOAK_ADMIN_CLIENT_SECRET) throw { code: 500, message: 'KEYCLOAK_ADMIN_CLIENT_SECRET not set' };
  const url = `${env.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${env.KEYCLOAK_ADMIN_REALM}/protocol/openid-connect/token`;
  const res = await post_form(url, {
    grant_type:    'client_credentials',
    client_id:     env.KEYCLOAK_ADMIN_CLIENT_ID,
    client_secret: env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  });
  if (res.status !== 200) throw translate_kc_error(res, 'Admin client_credentials grant failed');
  return (res.data as TokenSet).access_token;
};

const get_admin_token = async (): Promise<string> => {
  const now = Date.now();
  if (cached_admin_token && cached_admin_token.expires_at > now + 30_000) return cached_admin_token.token;
  const token = await fetch_admin_token();
  cached_admin_token = { token, expires_at: now + 50_000 };
  return token;
};

export type NewUserSpec = { email: string; password: string; first_name?: string; last_name?: string };

export const kc_create_user = async (spec: NewUserSpec): Promise<{ id: string }> => {
  ensure_kc_configured();
  const admin_token = await get_admin_token();
  const url         = `${env.KEYCLOAK_URL!.replace(/\/$/, '')}/admin/realms/${env.KEYCLOAK_REALM}/users`;
  const res = await axios.post(url, {
    username:     spec.email,
    email:        spec.email,
    firstName:    spec.first_name,
    lastName:     spec.last_name,
    enabled:      true,
    emailVerified: true,
    credentials:  [{ type: 'password', value: spec.password, temporary: false }],
  }, { headers: { Authorization: `Bearer ${admin_token}`, 'Content-Type': 'application/json' }, validateStatus: () => true });

  if (res.status === 409) throw { code: 409, message: 'A user with this email already exists' };
  if (res.status !== 201) throw translate_kc_error(res, 'Keycloak user creation failed');
  const location = res.headers?.location as string | undefined;
  const id       = location?.split('/').pop();
  if (!id) throw { code: 500, message: 'Keycloak did not return new user id' };
  return { id };
};
