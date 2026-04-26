import { ApiDetails } from '@setup/api/api.interface';
import bulk_update_users_function from './bulk-update-users.function';
import { bulk_update_users_query_zod } from './bulk-update-users.query.schema';
import { bulk_update_users_body_zod } from './bulk-update-users.body.schema';
import { bulk_update_users_tests } from './bulk-update-users.test';

export const bulk_update_users_details: ApiDetails = {
  module:               'Admin',
  api_name:             'Bulk Upsert Users',
  api_description:      'Upsert many users in one transaction. Existing users (by email) are updated; missing users are created in Keycloak with a temporary password.',
  method:               'post',
  path:                 '/api/admin/users/bulk',
  query_schema:         bulk_update_users_query_zod,
  body_schema:          bulk_update_users_body_zod,
  execution_function:   bulk_update_users_function as any,
  tests:                bulk_update_users_tests,
  roles:                ['Admin'],
  required_permissions: ['admin.users.read'],
  uses_transaction:     true,
};
