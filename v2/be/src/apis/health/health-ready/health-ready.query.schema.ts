import { z } from '@hono/zod-openapi';

export const health_ready_query_schema = {};
export const health_ready_query_zod    = z.object(health_ready_query_schema).strict();
