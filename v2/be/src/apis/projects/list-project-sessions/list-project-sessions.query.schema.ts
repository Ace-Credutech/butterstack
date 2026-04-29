import { z } from '@hono/zod-openapi';

export const list_project_sessions_query_schema = {
  project_id: z.string().uuid(),
  kind:       z.enum(['clarification', 'quiz', 'review']).optional(),
};
export const list_project_sessions_query_zod = z.object(list_project_sessions_query_schema).strict();
