import { z } from '@hono/zod-openapi';

export const auth_me_body_schema = {};
export const auth_me_body_zod    = z.object(auth_me_body_schema).strict();
