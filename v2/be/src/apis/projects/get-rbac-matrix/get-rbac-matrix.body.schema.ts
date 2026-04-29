import { z } from '@hono/zod-openapi';

export const get_rbac_matrix_body_schema = {};
export const get_rbac_matrix_body_zod    = z.object(get_rbac_matrix_body_schema).strict();
