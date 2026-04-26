import { z } from '@hono/zod-openapi';

export const list_roles_body_schema = {};
export const list_roles_body_zod = z.object(list_roles_body_schema).strict();
