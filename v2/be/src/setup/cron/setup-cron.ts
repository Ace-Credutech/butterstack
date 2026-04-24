import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '@setup/sequelize';
import { run_with_trace } from '@setup/trace-context';
import { CronRun } from '@models/cron-run.model';
import { log } from '@setup/log';
import { acquire_cron_lock, release_cron_lock } from './cron-lock';
import { unwrap_db_error, safe_rollback } from '@setup/db-error';
import { CronDetails } from './cron.interface';

const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000;

const record_run = async (args: { cron_name: string; fired_at: Date; started_at: Date | null; outcome: 'success' | 'error' | 'skipped-locked'; error_message?: string; duration_ms?: number; trace_id: string }) => {
  try {
    await CronRun.create({
      cron_name:    args.cron_name,
      fired_at:     args.fired_at,
      started_at:   args.started_at,
      finished_at:  args.started_at ? new Date() : null,
      outcome:      args.outcome,
      duration_ms:  args.duration_ms ?? null,
      error_message: args.error_message ?? null,
      trace_id:     args.trace_id,
    } as any);
  } catch (e: any) { log.warn('cron_run persist failed', { error: String(e?.message ?? e) }); }
};

const execute_once = async (details: CronDetails, fired_at: Date, trace_id: string) => {
  const lock_ttl = details.lock_ttl_ms ?? DEFAULT_LOCK_TTL_MS;
  const got_lock = await acquire_cron_lock(details.cron_name, lock_ttl);
  if (!got_lock) { await record_run({ cron_name: details.cron_name, fired_at, started_at: null, outcome: 'skipped-locked', trace_id }); return; }

  const started_at = Date.now();
  const open_tx    = details.uses_transaction ?? false;
  let transaction  = open_tx ? await sequelize.transaction() : null;

  try {
    const result = await details.execution_function({ trigger: 'cron', fired_at, trace_id }, transaction);
    if (open_tx && transaction) { await transaction.commit(); transaction = null; }
    await record_run({ cron_name: details.cron_name, fired_at, started_at: new Date(started_at), outcome: 'success', duration_ms: Date.now() - started_at, trace_id });
    log.info('cron.success', { cron_name: details.cron_name, duration_ms: Date.now() - started_at, result });
  } catch (error: any) {
    await safe_rollback(transaction);
    const db_err = unwrap_db_error(error);
    const msg    = db_err?.message ?? String(error?.message ?? error);
    log.error('cron.error', { cron_name: details.cron_name, error: msg });
    await record_run({ cron_name: details.cron_name, fired_at, started_at: new Date(started_at), outcome: 'error', error_message: msg, duration_ms: Date.now() - started_at, trace_id });
  } finally {
    await release_cron_lock(details.cron_name);
  }
};

const tasks: cron.ScheduledTask[] = [];

export const setup_cron = (details: CronDetails) => {
  if (!cron.validate(details.schedule)) throw new Error(`Invalid cron schedule "${details.schedule}" for ${details.cron_name}`);
  const task = cron.schedule(details.schedule, async () => {
    const fired_at = new Date();
    const trace_id = uuidv4();
    await run_with_trace({ trace_id }, () => execute_once(details, fired_at, trace_id));
  }, { timezone: details.timezone });
  tasks.push(task);
  log.info('cron.registered', { cron_name: details.cron_name, schedule: details.schedule });
};

export const stop_all_crons = () => { for (const t of tasks) t.stop(); tasks.length = 0; };
