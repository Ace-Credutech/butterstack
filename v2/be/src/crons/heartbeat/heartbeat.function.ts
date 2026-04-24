import { CronContext, CronResult } from '@setup/cron/cron.interface';
import { Error_Interface } from '@config/interfaces/error.interface';
import { log } from '@setup/log';

const heartbeat_function = async (ctx: CronContext): Promise<CronResult | Error_Interface> => {
  log.info('heartbeat.fired', { fired_at: ctx.fired_at.toISOString() });
  return { code: 200, message: 'heartbeat', data: { fired_at: ctx.fired_at.toISOString() } };
};

export default heartbeat_function;
