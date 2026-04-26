import { ApiDetails } from '@setup/api/api.interface';
import create_role_function from './create-role.function';
import { create_role_query_zod } from './create-role.query.schema';
import { create_role_body_zod } from './create-role.body.schema';
import { create_role_tests } from './create-role.test';

export const create_role_details: ApiDetails = {
  module:               'Admin',
  api_name:             'Create Role',
  api_description:      'Create a custom role with permission JSONB',
  method:               'post',
  path:                 '/api/admin/roles',
  query_schema:         create_role_query_zod,
  body_schema:          create_role_body_zod,
  execution_function:   create_role_function as any,
  tests:                create_role_tests,
  roles:                ['Admin'],
  required_permissions: ['admin.roles.update'],
  uses_transaction:     true,
};
