import { ApiDetails } from '@setup/api/api.interface';
import auth_reset_password_function from './auth-reset-password.function';
import { auth_reset_password_query_zod } from './auth-reset-password.query.schema';
import { auth_reset_password_body_zod } from './auth-reset-password.body.schema';
import { auth_reset_password_tests } from './auth-reset-password.test';

export const auth_reset_password_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Reset Password',
  api_description:     'Consume a password reset token and set a new password via Keycloak admin API.',
  method:              'post',
  path:                '/api/auth/reset-password',
  query_schema:        auth_reset_password_query_zod,
  body_schema:         auth_reset_password_body_zod,
  execution_function:  auth_reset_password_function as any,
  tests:               auth_reset_password_tests,
  roles:               ['Public'],
  uses_transaction:    true,
};
