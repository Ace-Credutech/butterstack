import { z } from '@hono/zod-openapi';

export const health_live_body_schema = {};
export const health_live_body_zod    = z.object(health_live_body_schema).strict();
