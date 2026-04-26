import { z } from '@hono/zod-openapi';

export const list_users_body_schema = {};
export const list_users_body_zod    = z.object(list_users_body_schema).strict();
