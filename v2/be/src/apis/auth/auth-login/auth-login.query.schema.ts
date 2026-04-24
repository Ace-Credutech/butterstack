import { z } from '@hono/zod-openapi';

export const auth_login_query_schema = {};
export const auth_login_query_zod    = z.object(auth_login_query_schema).strict();
