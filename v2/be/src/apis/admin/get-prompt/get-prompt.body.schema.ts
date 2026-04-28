import { z } from '@hono/zod-openapi';
export const get_prompt_body_schema = {};
export const get_prompt_body_zod    = z.object(get_prompt_body_schema).strict();
