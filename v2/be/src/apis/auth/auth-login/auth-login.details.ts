import { ApiDetails } from '@setup/api/api.interface';
import auth_login_function from './auth-login.function';
import { auth_login_query_zod } from './auth-login.query.schema';
import { auth_login_body_zod } from './auth-login.body.schema';
import { auth_login_tests } from './auth-login.test';

export const auth_login_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Login',
  api_description:     'Password-grant login. Validates credentials against Keycloak, verifies returned token, upserts user row, returns access+refresh tokens.',
  method:              'post',
  path:                '/api/auth/login',
  query_schema:        auth_login_query_zod,
  body_schema:         auth_login_body_zod,
  execution_function:  auth_login_function as any,
  tests:               auth_login_tests,
  roles:               ['Public'],
  uses_transaction:    true,
};
