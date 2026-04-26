import { z } from '@hono/zod-openapi';

const upsert_op = z.object({
  email:      z.string().email(),
  role_slug:  z.string().optional(),
  is_active:  z.boolean().optional(),
  name:       z.string().min(1).max(120).optional(),
  first_name: z.string().min(1).max(60).optional(),
  last_name:  z.string().min(1).max(60).optional(),
  password:   z.string().min(8).max(120).optional(),
});

export const bulk_update_users_body_schema = {
  updates: z.array(upsert_op).min(1).max(1000),
};
export const bulk_update_users_body_zod = z.object(bulk_update_users_body_schema).strict();
