import { z } from '@hono/zod-openapi';

export const health_ready_body_schema = {};
export const health_ready_body_zod    = z.object(health_ready_body_schema).strict();
