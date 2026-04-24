import { auth_register_tests_interface } from './auth-register.interface';

export const auth_register_tests: auth_register_tests_interface[] = [
  {
    name:  'Weak password rejected by Zod',
    input: { email: 'x@example.com', password: 'short' },
    check_output: (_i, o) => { if (o.code !== 400) throw new Error('expected 400 validation error'); },
  },
];
