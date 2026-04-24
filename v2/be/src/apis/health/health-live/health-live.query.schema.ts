import { z } from '@hono/zod-openapi';

export const health_live_query_schema = {};
export const health_live_query_zod    = z.object(health_live_query_schema).strict();
