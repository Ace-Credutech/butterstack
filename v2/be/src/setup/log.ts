import { get_trace } from './trace-context';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const emit = (level: LogLevel, msg: string, extra?: Record<string, unknown>) => {
  const trace = get_trace();
  const line  = {
    at:         new Date().toISOString(),
    level,
    msg,
    trace_id:   trace?.trace_id,
    user_id:    trace?.user_id,
    project_id: trace?.project_id,
    ...(extra ?? {}),
  };
  const output = JSON.stringify(line);
  if (level === 'error' || level === 'warn') console.error(output);
  else                                        console.log(output);
};

export const log = {
  debug: (msg: string, extra?: Record<string, unknown>) => emit('debug', msg, extra),
  info:  (msg: string, extra?: Record<string, unknown>) => emit('info',  msg, extra),
  warn:  (msg: string, extra?: Record<string, unknown>) => emit('warn',  msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emit('error', msg, extra),
};
