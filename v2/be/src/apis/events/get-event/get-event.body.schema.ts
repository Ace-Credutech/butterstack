import { z } from '@hono/zod-openapi';

export const get_event_body_schema = {};
export const get_event_body_zod    = z.object(get_event_body_schema).strict();
