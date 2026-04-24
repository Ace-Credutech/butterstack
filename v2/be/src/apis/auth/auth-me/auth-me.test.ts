import { auth_me_tests_interface } from './auth-me.interface';

export const auth_me_tests: auth_me_tests_interface[] = [
  {
    name:  'Returns unauthenticated when no user',
    input: { user: null },
    check_output: (_i, o) => { if (o.data?.authenticated !== false) throw new Error('expected unauthenticated'); },
  },
];
