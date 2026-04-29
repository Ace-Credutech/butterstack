import { z } from '@hono/zod-openapi';

export const get_initial_context_query_schema = {
  project_id: z.string().uuid(),
};
export const get_initial_context_query_zod = z.object(get_initial_context_query_schema).strict();
