import { z } from '@hono/zod-openapi';

export const list_orgs_body_schema = {};
export const list_orgs_body_zod    = z.object(list_orgs_body_schema).strict();
