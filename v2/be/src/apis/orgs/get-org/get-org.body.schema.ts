import { z } from '@hono/zod-openapi';

export const get_org_body_schema = {};
export const get_org_body_zod    = z.object(get_org_body_schema).strict();
