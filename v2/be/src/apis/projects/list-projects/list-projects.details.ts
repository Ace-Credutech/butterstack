import { ApiDetails } from '@setup/api/api.interface';
import list_projects_function from './list-projects.function';
import { list_projects_query_zod } from './list-projects.query.schema';
import { list_projects_body_zod } from './list-projects.body.schema';
import { list_projects_tests } from './list-projects.test';

export const list_projects_details: ApiDetails = {
  module:              'Projects',
  api_name:            'List Projects',
  api_description:     'Lists projects owned by the current user, cursor-paginated by created_at desc',
  method:              'get',
  path:                '/api/projects',
  query_schema:        list_projects_query_zod,
  body_schema:         list_projects_body_zod,
  execution_function:  list_projects_function as any,
  tests:               list_projects_tests,
  roles:               ['Member'],
  required_permissions: ['projects.list'],
  uses_transaction:    false,
};
