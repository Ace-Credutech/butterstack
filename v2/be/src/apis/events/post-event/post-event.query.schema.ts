import { z } from '@hono/zod-openapi';

export const post_event_query_schema = {};
export const post_event_query_zod    = z.object(post_event_query_schema).strict();
