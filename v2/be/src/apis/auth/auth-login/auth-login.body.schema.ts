import { z } from '@hono/zod-openapi';

export const auth_login_body_schema = {
  email:    z.string().email().openapi({ example: 'akash@thecontrast.in' }),
  password: z.string().min(1).openapi({ example: 'secret' }),
};
export const auth_login_body_zod = z.object(auth_login_body_schema).strict();
