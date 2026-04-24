import { z } from '@hono/zod-openapi';

const scope_schema = z.object({
  project_id:  z.string().uuid().openapi({ example: '00000000-0000-4000-8000-000000000001' }),
  module_id:   z.string().uuid().optional(),
  feature_id:  z.string().uuid().optional(),
  page_id:     z.string().uuid().optional(),
  session_id:  z.string().uuid().optional(),
}).passthrough();

export const post_event_body_schema = {
  type:                     z.string().min(1).openapi({ example: 'project.create' }),
  payload:                  z.record(z.unknown()).openapi({ example: { name: 'Demo', slug: 'demo' } }),
  scope:                    scope_schema,
  source:                   z.enum(['user', 'ai', 'system']).default('user'),
  idempotency_key:          z.string().uuid(),
  expected_version:         z.number().int().optional(),
  override_target_event_id: z.string().uuid().optional(),
  event_version:            z.number().int().default(1),
};

export const post_event_body_zod = z.object(post_event_body_schema).strict();
