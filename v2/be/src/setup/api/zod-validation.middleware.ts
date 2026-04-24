import { ZodError } from 'zod';
import { Error_Interface } from '@config/interfaces/error.interface';

export const format_zod_error = (err: ZodError): Error_Interface => {
  const issues = err.issues.map(i => ({
    path:    i.path.join('.'),
    code:    i.code,
    message: i.message,
  }));
  const first = issues[0];
  return {
    code:    400,
    message: first ? `${first.path}: ${first.message}` : 'Validation failed',
    details: { issues },
  };
};
