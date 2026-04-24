import { AsyncLocalStorage } from 'node:async_hooks';

export type TraceContext = {
  trace_id:   string;
  user_id?:   string;
  project_id?: string;
};

const storage = new AsyncLocalStorage<TraceContext>();

export const run_with_trace = <T>(ctx: TraceContext, fn: () => T): T => storage.run(ctx, fn);

export const get_trace    = (): TraceContext | undefined => storage.getStore();
export const get_trace_id = (): string                   => storage.getStore()?.trace_id ?? 'no-trace';
