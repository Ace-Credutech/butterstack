import { ApiDetails } from '@setup/api/api.interface';
import auth_forgot_password_function from './auth-forgot-password.function';
import { auth_forgot_password_query_zod } from './auth-forgot-password.query.schema';
import { auth_forgot_password_body_zod } from './auth-forgot-password.body.schema';
import { auth_forgot_password_tests } from './auth-forgot-password.test';

export const auth_forgot_password_details: ApiDetails = {
  module:              'Auth',
  api_name:            'Forgot Password',
  api_description:     'Request a password reset link via email. Always returns generic success to avoid email enumeration.',
  method:              'post',
  path:                '/api/auth/forgot-password',
  query_schema:        auth_forgot_password_query_zod,
  body_schema:         auth_forgot_password_body_zod,
  execution_function:  auth_forgot_password_function as any,
  tests:               auth_forgot_password_tests,
  roles:               ['Public'],
  uses_transaction:    true,
};
