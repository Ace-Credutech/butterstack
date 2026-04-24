import { ApiDetails } from '@setup/api/api.interface';
import auth_register_function from './auth-register.function';
import { auth_register_query_zod } from './auth-register.query.schema';
import { auth_register_body_zod } from './auth-register.body.schema';
import { auth_register_tests } from './auth-register.test';

export const auth_register_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Register',
  api_description:     'Creates a Keycloak user via admin API, immediately logs them in, upserts user row in DB, returns tokens.',
  method:              'post',
  path:                '/api/auth/register',
  query_schema:        auth_register_query_zod,
  body_schema:         auth_register_body_zod,
  execution_function:  auth_register_function as any,
  tests:               auth_register_tests,
  roles:               ['Public'],
  uses_transaction:    true,
};
