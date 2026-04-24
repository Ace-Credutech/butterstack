import { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { format_zod_error } from './api/zod-validation.middleware';
import { get_trace_id } from './trace-context';

export const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (result.success) return;
    const err = format_zod_error(result.error as any);
    return c.json({ error: { code: err.code, message: err.message, details: err.details, trace_id: get_trace_id() } }, err.code as any);
  },
});

app.use('*', logger());
app.use('*', cors({
  origin:        (origin) => origin ?? '*',
  credentials:   true,
  allowHeaders:  ['Content-Type', 'Authorization', 'X-Trace-Id', 'X-Idempotency-Key'],
  exposeHeaders: ['X-Trace-Id', 'X-Sequence-No'],
  maxAge:        86400,
}));

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info:    { title: 'Butterstack V2 API', version: '0.1.0' },
  servers: [{ url: 'http://localhost:3000', description: 'local' }],
});

app.get('/', (c) => c.json({ service: 'butterstack-be', version: '0.1.0' }));
