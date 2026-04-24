import { z } from '@hono/zod-openapi';

export const auth_refresh_query_schema = {};
export const auth_refresh_query_zod    = z.object(auth_refresh_query_schema).strict();
