import { ApiDetails } from '@setup/api/api.interface';
import list_roles_function from './list-roles.function';
import { list_roles_query_zod } from './list-roles.query.schema';
import { list_roles_body_zod } from './list-roles.body.schema';
import { list_roles_tests } from './list-roles.test';

export const list_roles_details: ApiDetails = {
  module:               'Admin',
  api_name:             'List Roles',
  api_description:      'List all roles with user counts and permissions',
  method:               'get',
  path:                 '/api/admin/roles',
  query_schema:         list_roles_query_zod,
  body_schema:          list_roles_body_zod,
  execution_function:   list_roles_function as any,
  tests:                list_roles_tests,
  roles:                ['Admin'],
  required_permissions: ['admin.roles.read'],
  uses_transaction:     false,
};
