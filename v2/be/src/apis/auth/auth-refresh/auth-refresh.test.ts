import { auth_refresh_tests_interface } from './auth-refresh.interface';

export const auth_refresh_tests: auth_refresh_tests_interface[] = [
  {
    name:  'Invalid refresh token rejected',
    input: { refresh_token: 'not-a-real-token' },
    check_output: (_i, o) => { if (o.code !== 400 && o.code !== 401) throw new Error('expected 400/401'); },
  },
];
