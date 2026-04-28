export type JobOpts = {
  delay_ms?:   number;
  run_at?:     Date;
  attempts?:   number;
  backoff_ms?: number;
  job_id?:     string;
};

export type JobRecord<P = unknown> = {
  id:       string;
  name:     string;
  payload:  P;
  attempts_made: number;
  queue:    string;
};

export type WorkerHandler<P = unknown> = (job: JobRecord<P>) => Promise<unknown>;

export interface QueueClient {
  publish<P = unknown>(queue: string, job_name: string, payload: P, opts?: JobOpts): Promise<string>;
  consume<P = unknown>(queue: string, handler: WorkerHandler<P>, concurrency: number): () => Promise<void>;
  add_repeatable(queue: string, job_name: string, payload: unknown, cron: string, opts?: JobOpts): Promise<void>;
  cancel_job(queue: string, job_id: string): Promise<boolean>;
  close(): Promise<void>;
}
