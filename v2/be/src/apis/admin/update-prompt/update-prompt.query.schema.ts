import { z } from '@hono/zod-openapi';
export const update_prompt_query_schema = { prompt_id: z.string().uuid() };
export const update_prompt_query_zod    = z.object(update_prompt_query_schema).strict();
