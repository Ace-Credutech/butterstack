import { ApiDetails } from '@setup/api/api.interface';
import auth_logout_function from './auth-logout.function';
import { auth_logout_query_zod } from './auth-logout.query.schema';
import { auth_logout_body_zod } from './auth-logout.body.schema';
import { auth_logout_tests } from './auth-logout.test';

export const auth_logout_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Logout',
  api_description:     'Clears session cookie and Redis session',
  method:              'post',
  path:                '/api/auth/logout',
  query_schema:        auth_logout_query_zod,
  body_schema:         auth_logout_body_zod,
  execution_function:  auth_logout_function as any,
  tests:               auth_logout_tests,
  roles:               ['Public'],
  uses_transaction:    false,
};
