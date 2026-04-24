import { z } from '@hono/zod-openapi';

export const list_projects_query_schema = {
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
};
export const list_projects_query_zod = z.object(list_projects_query_schema).strict();
