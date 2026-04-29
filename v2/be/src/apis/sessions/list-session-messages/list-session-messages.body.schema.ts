import { z } from '@hono/zod-openapi';

export const list_session_messages_body_schema = {};
export const list_session_messages_body_zod    = z.object(list_session_messages_body_schema).strict();
