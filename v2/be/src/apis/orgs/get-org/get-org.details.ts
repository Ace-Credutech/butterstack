import { ApiDetails } from '@setup/api/api.interface';
import get_org_function from './get-org.function';
import { get_org_query_zod } from './get-org.query.schema';
import { get_org_body_zod } from './get-org.body.schema';
import { get_org_tests } from './get-org.test';

export const get_org_details: ApiDetails = {
  module:               'Organisations',
  api_name:             'Get Organisation',
  api_description:      'Returns a single organisation the current user belongs to',
  method:               'get',
  path:                 '/api/orgs/{org_id}',
  query_schema:         get_org_query_zod,
  body_schema:          get_org_body_zod,
  execution_function:   get_org_function as any,
  tests:                get_org_tests,
  roles:            ['Member'],
  uses_transaction: false,
};
