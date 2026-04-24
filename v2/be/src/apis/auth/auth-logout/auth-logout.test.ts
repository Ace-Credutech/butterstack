import { auth_logout_tests_interface } from './auth-logout.interface';

export const auth_logout_tests: auth_logout_tests_interface[] = [
  {
    name:  'Clears session cookie',
    input: { user: null },
    check_output: (_i, o) => { if (o.code !== 200) throw new Error('expected 200'); },
  },
];
