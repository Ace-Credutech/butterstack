import { z } from '@hono/zod-openapi';

export const list_prompts_body_schema = {};
export const list_prompts_body_zod    = z.object(list_prompts_body_schema).strict();
