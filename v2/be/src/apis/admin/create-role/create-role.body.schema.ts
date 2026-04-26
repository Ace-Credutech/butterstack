import { z } from '@hono/zod-openapi';

export const create_role_body_schema = {
  slug:        z.string().regex(/^[a-z][a-z0-9_]{1,40}$/),
  name:        z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  permissions: z.record(z.any()).default({}),
};
export const create_role_body_zod = z.object(create_role_body_schema).strict();
