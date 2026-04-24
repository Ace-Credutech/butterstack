import { z } from '@hono/zod-openapi';

export const auth_register_body_schema = {
  email:      z.string().email().openapi({ example: 'new.user@example.com' }),
  password:   z.string().min(8).openapi({ example: 'strongPassword123' }),
  first_name: z.string().optional().openapi({ example: 'Akash' }),
  last_name:  z.string().optional().openapi({ example: 'Sadavarte' }),
};
export const auth_register_body_zod = z.object(auth_register_body_schema).strict();
