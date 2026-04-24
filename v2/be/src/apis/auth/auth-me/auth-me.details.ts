import { ApiDetails } from '@setup/api/api.interface';
import auth_me_function from './auth-me.function';
import { auth_me_query_zod } from './auth-me.query.schema';
import { auth_me_body_zod } from './auth-me.body.schema';
import { auth_me_tests } from './auth-me.test';

export const auth_me_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Me',
  api_description:     'Returns the current authenticated user, or authenticated:false',
  method:              'get',
  path:                '/api/auth/me',
  query_schema:        auth_me_query_zod,
  body_schema:         auth_me_body_zod,
  execution_function:  auth_me_function as any,
  tests:               auth_me_tests,
  roles:               ['Public'],
  uses_transaction:    false,
};
