import { Context } from 'hono';
import { ZodObject } from 'zod';
import { HttpMethod } from './api.interface';

const read_body = async (method: HttpMethod, c: Context): Promise<Record<string, unknown>> => {
  if (method === 'get') return {};
  try { return await c.req.json(); } catch { return {}; }
};

export const validate_and_return_body = async <T extends ZodObject<any>>(method: HttpMethod, schema: T, c: Context, allow_extra_keys?: boolean) => {
  const raw       = await read_body(method, c);
  const effective = allow_extra_keys ? schema.passthrough() : schema.strict();
  return effective.parse(raw);
};
