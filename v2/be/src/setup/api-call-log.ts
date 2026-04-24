import { ApiCallLog } from '@models/api-call-log.model';
import { log } from './log';

type Input = {
  module:         string;
  api_name:       string;
  method:         string;
  path:           string;
  user_id:        string | null;
  status_code:    number;
  duration_ms:    number;
  request_query?: Record<string, unknown>;
  request_body?:  Record<string, unknown>;
  error_message?: string;
  trace_id:       string;
};

export const write_api_call_log = async (input: Input): Promise<void> => {
  try {
    await ApiCallLog.create({
      module:        input.module,
      api_name:      input.api_name,
      method:        input.method,
      path:          input.path,
      user_id:       input.user_id,
      status_code:   input.status_code,
      duration_ms:   input.duration_ms,
      request_query: input.request_query ?? null,
      request_body:  input.request_body  ?? null,
      error_message: input.error_message ?? null,
      trace_id:      input.trace_id,
    } as any);
  } catch (e: any) {
    log.warn('api_call_log write failed', { error: String(e?.message ?? e) });
  }
};
