import { ApiDetails } from '@setup/api/api.interface';
import list_orgs_function from './list-orgs.function';
import { list_orgs_query_zod } from './list-orgs.query.schema';
import { list_orgs_body_zod } from './list-orgs.body.schema';
import { list_orgs_tests } from './list-orgs.test';

export const list_orgs_details: ApiDetails = {
  module:               'Organisations',
  api_name:             'List Organisations',
  api_description:      'Lists all organisations the current user belongs to',
  method:               'get',
  path:                 '/api/orgs',
  query_schema:         list_orgs_query_zod,
  body_schema:          list_orgs_body_zod,
  execution_function:   list_orgs_function as any,
  tests:                list_orgs_tests,
  roles:            ['Member'],
  uses_transaction: false,
};
