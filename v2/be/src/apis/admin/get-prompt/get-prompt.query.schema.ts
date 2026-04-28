import { z } from '@hono/zod-openapi';
export const get_prompt_query_schema = { prompt_id: z.string().uuid() };
export const get_prompt_query_zod    = z.object(get_prompt_query_schema).strict();
