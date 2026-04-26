import { z } from '@hono/zod-openapi';

export const update_user_body_schema = {
  role_slug:  z.string().optional(),
  is_active:  z.boolean().optional(),
  first_name: z.string().min(1).max(60).optional(),
  last_name:  z.string().max(60).optional(),
};
export const update_user_body_zod = z.object(update_user_body_schema).strict();
