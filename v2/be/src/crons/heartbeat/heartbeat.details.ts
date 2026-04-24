import { CronDetails } from '@setup/cron/cron.interface';
import heartbeat_function from './heartbeat.function';

export const heartbeat_details: CronDetails = {
  cron_name:          'heartbeat',
  description:        'Sanity heartbeat — fires every 5 minutes and records a cron_run row',
  schedule:           '*/5 * * * *',
  timezone:           'Asia/Kolkata',
  lock_ttl_ms:        60_000,
  max_runtime_ms:     10_000,
  execution_function: heartbeat_function,
  uses_transaction:   false,
  tests:              [],
};
