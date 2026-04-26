import { z } from '@hono/zod-openapi';

export const bulk_update_users_query_schema = {};
export const bulk_update_users_query_zod = z.object(bulk_update_users_query_schema).strict();
