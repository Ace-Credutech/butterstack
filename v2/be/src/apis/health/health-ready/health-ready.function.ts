import { Error_Interface } from '@config/interfaces/error.interface';
import { health_ready_function_params, health_ready_function_return } from './health-ready.interface';
import { sequelize } from '@setup/sequelize';
import { get_redis } from '@setup/redis';

const check_primary_db = async (): Promise<string> => {
  try { await sequelize.authenticate(); return 'ok'; }
  catch (e: any) { return `down: ${e.message}`; }
};

const check_redis = async (): Promise<string> => {
  try { const pong = await get_redis().ping(); return pong === 'PONG' ? 'ok' : 'unexpected'; }
  catch (e: any) { return `down: ${e.message}`; }
};

const all_ok = (checks: Record<string, string>): boolean => Object.values(checks).every(v => v === 'ok');

const health_ready_function = async (_data: health_ready_function_params): Promise<health_ready_function_return | Error_Interface> => {
  const primary_db = await check_primary_db();
  const redis      = await check_redis();
  const deps       = { primary_db, redis, storage: 'unchecked' };
  const ok         = all_ok(deps);
  if (!ok) return { code: 503, message: 'not-ready', data: { status: 'not-ready', deps } };
  return { code: 200, message: 'ready', data: { status: 'ready', deps } };
};

export default health_ready_function;
