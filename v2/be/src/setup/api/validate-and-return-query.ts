import { Context } from 'hono';
import { ZodObject } from 'zod';

export const validate_and_return_query = async <T extends ZodObject<any>>(schema: T, c: Context, allow_extra_keys?: boolean) => {
  const raw       = { ...c.req.param(), ...c.req.query() };
  const effective = allow_extra_keys ? schema.passthrough() : schema.strict();
  return effective.parse(raw);
};
