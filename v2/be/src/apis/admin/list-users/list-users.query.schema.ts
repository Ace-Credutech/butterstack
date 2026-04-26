import { z } from '@hono/zod-openapi';

export const list_users_query_schema = {
  q:         z.string().trim().min(1).max(200).optional(),
  role_slug: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  sort:      z.enum(['created_at', 'name', 'email']).default('created_at'),
  dir:       z.enum(['asc', 'desc']).default('desc'),
  page:      z.coerce.number().int().min(1).default(1),
  size:      z.coerce.number().int().min(1).max(200).default(25),
};
export const list_users_query_zod = z.object(list_users_query_schema).strict();
