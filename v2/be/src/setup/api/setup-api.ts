import { Context } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { app } from '@setup/hono';
import { sequelize } from '@setup/sequelize';
import { run_with_trace } from '@setup/trace-context';
import { log } from '@setup/log';
import { unwrap_db_error, safe_rollback } from '@setup/db-error';
import { write_api_call_log } from '@setup/api-call-log';
import { ApiDetails } from './api.interface';
import { setup_swagger } from './setup-swagger';
import { validate_and_return_query } from './validate-and-return-query';
import { validate_and_return_body } from './validate-and-return-body';
import { send_response } from './send-response';
import { send_error } from './send-error';
import { format_zod_error } from './zod-validation.middleware';
import { has_all_permissions } from './permission.util';

const should_open_transaction = (details: ApiDetails): boolean => {
  if (details.uses_transaction !== undefined) return details.uses_transaction;
  return details.method !== 'get';
};

const trace_from_headers = (c: Context): string => c.req.header('X-Trace-Id') || uuidv4();

const build_trace_context = (c: Context, trace_id: string) => {
  const user = c.get('user');
  return { trace_id, user_id: user?.id };
};

const check_permissions = (details: ApiDetails, user: any) => {
  if (!details.required_permissions || details.required_permissions.length === 0) return null;
  if (!user) return { code: 401, message: 'Authorization required' };
  if (!has_all_permissions(user, details.required_permissions)) {
    return { code: 403, message: `Missing required permissions: ${details.required_permissions.join(', ')}` };
  }
  return null;
};

const snapshot_request = async (c: Context, details: ApiDetails) => {
  const started_at = Date.now();
  let body: Record<string, unknown> | undefined;
  if (details.method !== 'get') { try { body = await c.req.json(); } catch { /* ignore */ } }
  return { started_at, body, query: c.req.query() };
};

const redact_for_log = (body: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!body) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) out[k] = /password|secret|token/i.test(k) ? '[REDACTED]' : v;
  return out;
};

const run_handler = async (details: ApiDetails, c: Context) => {
  const query = await validate_and_return_query(details.query_schema, c, details.allow_extra_keys);
  const body  = await validate_and_return_body(details.method, details.body_schema, c, details.allow_extra_keys);
  const user  = c.get('user');

  const perm_error = check_permissions(details, user);
  if (perm_error) return send_error(c, perm_error, perm_error.code, details);

  const open_tx     = should_open_transaction(details);
  let   transaction = open_tx ? await sequelize.transaction() : null;

  try {
    const data     = { ...query, ...body, user, trace_id: c.get('trace_id') };
    const response = await details.execution_function(data, transaction as any);
    if (open_tx && transaction) { await transaction.commit(); transaction = null; }

    if (response && typeof response === 'object' && 'code' in response && 'message' in response) {
      const code = (response as any).code ?? 200;
      return await send_response(c, response, code, details);
    }
    return await send_response(c, { code: 205, message: `${details.api_name} succeeded but response shape was unexpected`, data: response }, 205, details);
  } catch (error) {
    await safe_rollback(transaction);
    transaction = null;
    throw error;
  }
};

const handle_error = (c: Context, details: ApiDetails, error: any) => {
  if (error?.name === 'ZodError') {
    const err = format_zod_error(error);
    return send_error(c, err, err.code, details);
  }
  const db_err = unwrap_db_error(error);
  if (db_err) {
    log.error(`[${details.module}/${details.api_name}] db error`, { code: db_err.code, details: db_err.details, message: db_err.message });
    return send_error(c, db_err, db_err.code, details);
  }
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const code = (error as any).code ?? 400;
    return send_error(c, error, code, details);
  }
  log.error(`[${details.module}/${details.api_name}] uncaught`, { error: String(error?.message ?? error) });
  return send_error(c, { code: 500, message: `Uncaught ${details.api_name} error`, details: String(error?.message ?? error) }, 500, details);
};

export const setup_api = (details: ApiDetails) => {
  const swagger_info = setup_swagger(details);
  app.openapi(swagger_info as any, (async (c: Context) => {
    const trace_id   = trace_from_headers(c);
    c.set('trace_id', trace_id);
    return run_with_trace(build_trace_context(c, trace_id), async () => {
      const snap = await snapshot_request(c, details);
      let response: Response;
      let status_code = 500;
      let error_message: string | undefined;
      try {
        response    = await run_handler(details, c);
        status_code = response.status;
      } catch (error: any) {
        response      = (handle_error(c, details, error)) as Response;
        status_code   = response.status;
        error_message = String(error?.message ?? error);
      }
      write_api_call_log({
        module:     details.module,
        api_name:   details.api_name,
        method:     details.method,
        path:       details.path,
        user_id:    c.get('user')?.id ?? null,
        status_code,
        duration_ms: Date.now() - snap.started_at,
        request_query: snap.query,
        request_body:  redact_for_log(snap.body),
        error_message,
        trace_id,
      });
      return response;
    });
  }) as any);
};
