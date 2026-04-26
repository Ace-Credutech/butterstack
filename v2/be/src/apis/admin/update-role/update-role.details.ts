import { ApiDetails } from '@setup/api/api.interface';
import update_role_function from './update-role.function';
import { update_role_query_zod } from './update-role.query.schema';
import { update_role_body_zod } from './update-role.body.schema';
import { update_role_tests } from './update-role.test';

export const update_role_details: ApiDetails = {
  module:               'Admin',
  api_name:             'Update Role',
  api_description:      'Update a role: name, description, permissions JSONB',
  method:               'patch',
  path:                 '/api/admin/roles/{id}',
  query_schema:         update_role_query_zod,
  body_schema:          update_role_body_zod,
  execution_function:   update_role_function as any,
  tests:                update_role_tests,
  roles:                ['Admin'],
  required_permissions: ['admin.roles.update'],
  uses_transaction:     true,
};
