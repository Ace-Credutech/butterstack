import { z } from '@hono/zod-openapi';

export const auth_logout_query_schema = {};
export const auth_logout_query_zod    = z.object(auth_logout_query_schema).strict();
