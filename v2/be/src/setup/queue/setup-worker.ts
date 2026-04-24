import { v4 as uuidv4 } from 'uuid';
import { get_queue } from './queue';
import { run_with_trace } from '@setup/trace-context';
import { call_api_internally } from './internal-api-caller';
import { log } from '@setup/log';

export type WorkerDetails = {
  queue:        string;
  job_name:     string;
  description:  string;
  concurrency?: number;
  api_call:     (payload: any) => {
    method:    'get' | 'post' | 'put' | 'patch' | 'delete';
    path:      string;
    query?:    Record<string, unknown>;
    body?:     Record<string, unknown>;
    session_id?: string;
  };
  tests?: any[];
};

const registry: WorkerDetails[] = [];

export const setup_worker = (details: WorkerDetails) => { registry.push(details); };

const find_handlers_for_queue = (queue: string) => registry.filter(w => w.queue === queue);

const handle_job = async (worker: WorkerDetails, payload: any) => {
  const trace_id = (payload as any)?.trace_id ?? uuidv4();
  return run_with_trace({ trace_id }, async () => {
    const call    = worker.api_call(payload);
    const result  = await call_api_internally({ ...call, trace_id });
    if (result.status < 200 || result.status >= 300) {
      log.error('worker.api_error', { queue: worker.queue, job_name: worker.job_name, status: result.status, body: result.body });
      throw new Error(`Internal API call failed: ${result.status} ${JSON.stringify(result.body).slice(0, 400)}`);
    }
    return result.body;
  });
};

export const start_workers = () => {
  const queues = new Set(registry.map(w => w.queue));
  const queue_client = get_queue();
  for (const queue of queues) {
    const workers = find_handlers_for_queue(queue);
    queue_client.consume(queue, async (job) => {
      const worker = workers.find(w => w.job_name === job.name);
      if (!worker) { log.warn('worker.no_handler', { queue, job_name: job.name }); return; }
      return handle_job(worker, job.payload);
    }, workers[0]?.concurrency ?? 4);
    log.info('worker.registered', { queue, handlers: workers.map(w => w.job_name) });
  }
};

export const get_worker_registry = () => registry;
