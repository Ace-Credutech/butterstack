import { z } from '@hono/zod-openapi';

export const get_event_query_schema = {
  id: z.string().uuid().openapi({ example: '00000000-0000-4000-8000-000000000001' }),
};
export const get_event_query_zod = z.object(get_event_query_schema).strict();
