import { v4 as uuidv4 } from 'uuid';
import { get_redis } from '@setup/redis';

const POD_ID = uuidv4();
const key_for = (cron_name: string) => `cron-lock:${cron_name}`;

export const acquire_cron_lock = async (cron_name: string, ttl_ms: number): Promise<boolean> => {
  const r = get_redis();
  const result = await r.set(key_for(cron_name), POD_ID, 'PX', ttl_ms, 'NX');
  return result === 'OK';
};

export const release_cron_lock = async (cron_name: string): Promise<void> => {
  const r = get_redis();
  const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
  await r.eval(script, 1, key_for(cron_name), POD_ID).catch(() => {});
};
