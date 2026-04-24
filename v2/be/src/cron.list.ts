import { CronDetails } from '@setup/cron/cron.interface';
import { heartbeat_details } from '@src/crons/heartbeat/heartbeat.details';

export const cron_list: CronDetails[] = [
  heartbeat_details,
];
