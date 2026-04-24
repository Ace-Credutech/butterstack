import { get_redis } from './redis';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const key_for = (sid: string) => `session:${sid}`;

export type SessionData = {
  user_id:       string;
  keycloak_sub:  string;
  email:         string;
  name:          string;
  access_token?: string;
  expires_at?:   number;
};

export const save_session   = async (sid: string, data: SessionData) => get_redis().set(key_for(sid), JSON.stringify(data), 'EX', SESSION_TTL_SECONDS);
export const load_session   = async (sid: string): Promise<SessionData | null> => {
  const raw = await get_redis().get(key_for(sid));
  return raw ? JSON.parse(raw) as SessionData : null;
};
export const delete_session = async (sid: string) => get_redis().del(key_for(sid));
