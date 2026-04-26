import { z } from '@hono/zod-openapi';

export const auth_forgot_password_query_schema = {};
export const auth_forgot_password_query_zod = z.object(auth_forgot_password_query_schema).strict();
