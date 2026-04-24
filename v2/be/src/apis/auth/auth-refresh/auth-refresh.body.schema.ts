import { z } from '@hono/zod-openapi';

export const auth_refresh_body_schema = {
  refresh_token: z.string().min(1),
};
export const auth_refresh_body_zod = z.object(auth_refresh_body_schema).strict();
