import { z } from '@hono/zod-openapi';

export const get_org_query_schema = {
  org_id: z.string().uuid(),
};
export const get_org_query_zod = z.object(get_org_query_schema).strict();
