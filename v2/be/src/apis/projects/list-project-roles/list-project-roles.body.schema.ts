import { z } from '@hono/zod-openapi';

export const list_project_roles_body_schema = {};
export const list_project_roles_body_zod    = z.object(list_project_roles_body_schema).strict();
