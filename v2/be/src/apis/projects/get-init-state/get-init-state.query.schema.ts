import { z } from '@hono/zod-openapi';

export const get_init_state_query_schema = {
  project_id: z.string().uuid(),
};
export const get_init_state_query_zod = z.object(get_init_state_query_schema).strict();
