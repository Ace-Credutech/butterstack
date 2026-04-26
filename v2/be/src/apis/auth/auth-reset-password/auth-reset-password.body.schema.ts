import { z } from '@hono/zod-openapi';

export const auth_reset_password_body_schema = {
  token:        z.string().min(20),
  new_password: z.string().min(8).max(120),
};
export const auth_reset_password_body_zod = z.object(auth_reset_password_body_schema).strict();
