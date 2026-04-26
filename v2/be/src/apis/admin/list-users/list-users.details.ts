import { ApiDetails } from '@setup/api/api.interface';
import list_users_function from './list-users.function';
import { list_users_query_zod } from './list-users.query.schema';
import { list_users_body_zod } from './list-users.body.schema';
import { list_users_tests } from './list-users.test';

export const list_users_details: ApiDetails = {
  module:               'Admin',
  api_name:             'List Users',
  api_description:      'Paginated, filterable, sortable list of users for admin views',
  method:               'get',
  path:                 '/api/admin/users',
  query_schema:         list_users_query_zod,
  body_schema:          list_users_body_zod,
  execution_function:   list_users_function as any,
  tests:                list_users_tests,
  roles:                ['Admin'],
  required_permissions: ['admin.users.read'],
  uses_transaction:     false,
};
