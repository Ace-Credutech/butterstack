import { createRoute } from '@hono/zod-openapi';
import { z, ZodObject } from 'zod';
import { ApiDetails } from './api.interface';

const generic_ok    = z.object({ code: z.number(), message: z.string(), data: z.any().optional() });
const generic_error = z.object({ error: z.object({ code: z.number(), message: z.string(), details: z.any().optional(), trace_id: z.string() }) });

const extract_path_param_names = (path: string): string[] => Array.from(path.matchAll(/\{(\w+)\}/g)).map(m => m[1]!);

const split_params_and_query = (path: string, schema: ZodObject<any>) => {
  const param_names = extract_path_param_names(path);
  if (param_names.length === 0) return { params: undefined, query: schema };
  const shape       = schema.shape as Record<string, any>;
  const params_shape: Record<string, any> = {};
  const query_shape:  Record<string, any> = {};
  for (const [k, v] of Object.entries(shape)) {
    if (param_names.includes(k)) params_shape[k] = v;
    else                         query_shape[k]  = v;
  }
  return { params: z.object(params_shape), query: z.object(query_shape) };
};

export const setup_swagger = (details: ApiDetails) => {
  const has_body          = details.method !== 'get';
  const namespace         = details.sub_module ? `${details.module}/${details.sub_module}` : details.module;
  const { params, query } = split_params_and_query(details.path, details.query_schema);
  return createRoute({
    method: details.method,
    path:   details.path,
    tags:   [namespace],
    summary:     details.api_name,
    description: details.api_description,
    request: {
      ...(params ? { params } : {}),
      query,
      ...(has_body ? { body: { content: { 'application/json': { schema: details.body_schema } } } } : {}),
    },
    responses: {
      200: { description: 'Success', content: { 'application/json': { schema: generic_ok } } },
      400: { description: 'Bad Request', content: { 'application/json': { schema: generic_error } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: generic_error } } },
      403: { description: 'Forbidden',    content: { 'application/json': { schema: generic_error } } },
      404: { description: 'Not Found',    content: { 'application/json': { schema: generic_error } } },
      409: { description: 'Conflict',     content: { 'application/json': { schema: generic_error } } },
      500: { description: 'Server Error', content: { 'application/json': { schema: generic_error } } },
    },
  } as const);
};
