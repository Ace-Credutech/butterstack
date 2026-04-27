import { z } from '@hono/zod-openapi';

export const list_orgs_query_schema = {};
export const list_orgs_query_zod    = z.object(list_orgs_query_schema).strict();
