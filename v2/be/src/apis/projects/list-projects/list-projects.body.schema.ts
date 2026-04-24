import { z } from '@hono/zod-openapi';

export const list_projects_body_schema = {};
export const list_projects_body_zod    = z.object(list_projects_body_schema).strict();
