import { z } from '@hono/zod-openapi';

export const list_roles_query_schema = {};
export const list_roles_query_zod = z.object(list_roles_query_schema).strict();
