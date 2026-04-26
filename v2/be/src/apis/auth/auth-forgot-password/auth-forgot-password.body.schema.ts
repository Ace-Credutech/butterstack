import { z } from '@hono/zod-openapi';

export const auth_forgot_password_body_schema = {
  email:        z.string().email(),
  redirect_uri: z.string().url().optional(),
};
export const auth_forgot_password_body_zod = z.object(auth_forgot_password_body_schema).strict();
