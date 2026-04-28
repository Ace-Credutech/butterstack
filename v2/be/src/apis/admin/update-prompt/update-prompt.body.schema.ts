import { z } from '@hono/zod-openapi';

const MODELS          = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-5', 'gpt-4.1'] as const;
const RESPONSE_FORMATS = ['text', 'json', 'json_schema'] as const;

export const update_prompt_body_schema = {
  model:           z.enum(MODELS).optional(),
  temperature:     z.number().min(0).max(2).optional(),
  max_tokens:      z.number().int().min(1).max(32000).optional(),
  response_format: z.enum(RESPONSE_FORMATS).optional(),
  system_text:     z.string().min(1).optional(),
  user_template:   z.string().optional(),
  notes:           z.string().optional(),
};
export const update_prompt_body_zod = z.object(update_prompt_body_schema);
