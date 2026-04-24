import { ApiDetails } from '@setup/api/api.interface';
import auth_refresh_function from './auth-refresh.function';
import { auth_refresh_query_zod } from './auth-refresh.query.schema';
import { auth_refresh_body_zod } from './auth-refresh.body.schema';
import { auth_refresh_tests } from './auth-refresh.test';

export const auth_refresh_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Refresh',
  api_description:     'Exchanges a refresh token for a new access token (Keycloak refresh_token grant)',
  method:              'post',
  path:                '/api/auth/refresh',
  query_schema:        auth_refresh_query_zod,
  body_schema:         auth_refresh_body_zod,
  execution_function:  auth_refresh_function as any,
  tests:               auth_refresh_tests,
  roles:               ['Public'],
  uses_transaction:    false,
};
