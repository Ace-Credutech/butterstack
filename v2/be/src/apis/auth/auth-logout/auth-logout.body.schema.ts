import { z } from '@hono/zod-openapi';

export const auth_logout_body_schema = {
  refresh_token: z.string().min(1).optional(),
};
export const auth_logout_body_zod = z.object(auth_logout_body_schema).strict();
