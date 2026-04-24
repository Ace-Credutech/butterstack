import { Context } from 'hono';
import { ApiDetails } from './api.interface';
import { Error_Interface } from '@config/interfaces/error.interface';
import { get_trace_id } from '@setup/trace-context';

export const send_error = (c: Context, error: Error_Interface, code: number, _details: ApiDetails) => {
  const trace_id = get_trace_id();
  c.header('X-Trace-Id', trace_id);
  return c.json({
    error: {
      code:     error.code ?? code,
      message:  error.message,
      details:  error.details,
      trace_id,
    },
  }, code as any);
};
