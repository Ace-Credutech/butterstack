import { z } from '@hono/zod-openapi';

export const update_role_query_schema = {
  id: z.string().uuid(),
};
export const update_role_query_zod = z.object(update_role_query_schema).strict();
