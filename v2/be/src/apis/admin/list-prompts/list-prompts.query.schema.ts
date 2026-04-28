import { z } from '@hono/zod-openapi';

export const list_prompts_query_schema = {};
export const list_prompts_query_zod    = z.object(list_prompts_query_schema).strict();
