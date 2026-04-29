import { z } from '@hono/zod-openapi';

export const get_init_state_body_schema = {};
export const get_init_state_body_zod    = z.object(get_init_state_body_schema).strict();
