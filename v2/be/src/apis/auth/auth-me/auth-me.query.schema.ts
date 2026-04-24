import { z } from '@hono/zod-openapi';

export const auth_me_query_schema = {};
export const auth_me_query_zod    = z.object(auth_me_query_schema).strict();
