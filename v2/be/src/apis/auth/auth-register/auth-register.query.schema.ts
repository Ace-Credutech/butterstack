import { z } from '@hono/zod-openapi';

export const auth_register_query_schema = {};
export const auth_register_query_zod    = z.object(auth_register_query_schema).strict();
