import { ApiDetails } from '@setup/api/api.interface';
import update_user_function from './update-user.function';
import { update_user_query_zod } from './update-user.query.schema';
import { update_user_body_zod } from './update-user.body.schema';
import { update_user_tests } from './update-user.test';

export const update_user_details: ApiDetails = {
  module:               'Admin',
  api_name:             'Update User',
  api_description:      'Assign role or toggle active status on a user',
  method:               'patch',
  path:                 '/api/admin/users/{id}',
  query_schema:         update_user_query_zod,
  body_schema:          update_user_body_zod,
  execution_function:   update_user_function as any,
  tests:                update_user_tests,
  roles:                ['Admin'],
  required_permissions: ['admin.users.read'],
  uses_transaction:     true,
};
