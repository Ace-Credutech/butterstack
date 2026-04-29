import { z } from '@hono/zod-openapi';

export const list_project_documents_query_schema = {
  project_id: z.string().uuid(),
};
export const list_project_documents_query_zod = z.object(list_project_documents_query_schema).strict();
