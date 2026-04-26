import { z } from '@hono/zod-openapi';

export const update_user_body_schema = {
  role_slug: z.string().optional(),
  is_active: z.boolean().optional(),
};
export const update_user_body_zod = z.object(update_user_body_schema).strict();
