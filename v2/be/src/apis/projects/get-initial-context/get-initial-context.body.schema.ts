import { z } from '@hono/zod-openapi';

export const get_initial_context_body_schema = {};
export const get_initial_context_body_zod    = z.object(get_initial_context_body_schema).strict();
