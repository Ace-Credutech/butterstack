import { env } from '@src/env';
import { get_trace } from './trace-context';

type SlowQueryLog = {
  db_name:     string;
  sql:         string;
  duration_ms: number;
  trace_id:    string;
  user_id?:    string;
  project_id?: string;
  caller?:     string;
  at:          string;
};

const find_caller = (): string | undefined => {
  const stack = new Error().stack?.split('\n') ?? [];
  const hit   = stack.find(l => l.includes('/src/') && !l.includes('slow-query-logger') && !l.includes('sequelize'));
  return hit?.trim();
};

const redact_sql = (sql: string): string => sql.replace(/'[^']*'/g, "'***'").slice(0, 2000);

const emit_log = (log: SlowQueryLog) => {
  console.log(JSON.stringify({ kind: 'slow-query', ...log }));
};

export const make_sequelize_logger = (db_name: string) => (sql: string, duration_ms?: number) => {
  const ms = duration_ms ?? 0;
  if (ms < env.SLOW_QUERY_MS) return;
  const trace = get_trace();
  emit_log({
    db_name,
    sql:         redact_sql(sql),
    duration_ms: ms,
    trace_id:    trace?.trace_id    ?? 'no-trace',
    user_id:     trace?.user_id,
    project_id:  trace?.project_id,
    caller:      find_caller(),
    at:          new Date().toISOString(),
  });
};
