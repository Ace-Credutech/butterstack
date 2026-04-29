import { z } from '@hono/zod-openapi';

export const list_project_documents_body_schema = {};
export const list_project_documents_body_zod    = z.object(list_project_documents_body_schema).strict();
