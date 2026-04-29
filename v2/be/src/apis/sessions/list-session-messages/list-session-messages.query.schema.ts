import { z } from '@hono/zod-openapi';

export const list_session_messages_query_schema = {
  session_id: z.string().uuid(),
};
export const list_session_messages_query_zod = z.object(list_session_messages_query_schema).strict();
