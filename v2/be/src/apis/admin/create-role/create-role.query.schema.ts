import { z } from '@hono/zod-openapi';

export const create_role_query_schema = {};
export const create_role_query_zod = z.object(create_role_query_schema).strict();
