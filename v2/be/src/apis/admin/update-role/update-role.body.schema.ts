import { z } from '@hono/zod-openapi';

export const update_role_body_schema = {
  name:        z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  permissions: z.record(z.any()).optional(),
};
export const update_role_body_zod = z.object(update_role_body_schema).strict();
