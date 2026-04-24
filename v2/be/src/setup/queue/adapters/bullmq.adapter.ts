import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@src/env';
import { QueueClient, JobOpts, WorkerHandler, JobRecord } from '../queue-client';
import { log } from '@setup/log';

const build_connection = () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

const queues_by_name:  Map<string, Queue>  = new Map();
const workers_running: Worker[]            = [];

const get_or_build_queue = (queue: string): Queue => {
  const cached = queues_by_name.get(queue);
  if (cached) return cached;
  const q = new Queue(queue, { connection: build_connection() });
  queues_by_name.set(queue, q);
  return q;
};

const to_record = <P>(job: Job<P>, queue: string): JobRecord<P> => ({
  id:            job.id ?? 'no-id',
  name:          job.name,
  payload:       job.data,
  attempts_made: job.attemptsMade,
  queue,
});

const translate_opts = (opts?: JobOpts) => ({
  delay:    opts?.delay_ms ?? (opts?.run_at ? Math.max(0, opts.run_at.getTime() - Date.now()) : undefined),
  attempts: opts?.attempts ?? 5,
  backoff:  opts?.backoff_ms ? { type: 'exponential' as const, delay: opts.backoff_ms } : { type: 'exponential' as const, delay: 2000 },
  jobId:    opts?.job_id,
});

export const bullmq_adapter = (): QueueClient => ({
  async publish(queue, job_name, payload, opts) {
    const q   = get_or_build_queue(queue);
    const job = await q.add(job_name, payload, translate_opts(opts));
    log.info('queue.publish', { queue, job_name, job_id: job.id });
    return job.id ?? 'no-id';
  },
  consume(queue, handler, concurrency) {
    const worker = new Worker(queue, async (job) => handler(to_record(job as any, queue)), { connection: build_connection(), concurrency });
    worker.on('completed', (job) => log.info('queue.completed', { queue, job_id: job.id, job_name: job.name }));
    worker.on('failed',    (job, err) => log.error('queue.failed', { queue, job_id: job?.id, job_name: job?.name, error: String(err?.message ?? err) }));
    workers_running.push(worker);
    return async () => { await worker.close(); };
  },
  async add_repeatable(queue, job_name, payload, cron, opts) {
    const q = get_or_build_queue(queue);
    await q.add(job_name, payload, { ...translate_opts(opts), repeat: { pattern: cron } });
    log.info('queue.repeatable.added', { queue, job_name, cron });
  },
  async close() {
    await Promise.all(workers_running.map(w => w.close()));
    for (const q of queues_by_name.values()) await q.close();
    workers_running.length = 0;
    queues_by_name.clear();
  },
});
