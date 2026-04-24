import { auth_login_tests_interface } from './auth-login.interface';

export const auth_login_tests: auth_login_tests_interface[] = [
  {
    name:  'Rejects invalid credentials',
    input: { email: 'nobody@example.com', password: 'wrong' },
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
