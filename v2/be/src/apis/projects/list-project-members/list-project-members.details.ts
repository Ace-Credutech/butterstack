import { ApiDetails } from '@setup/api/api.interface';
import list_project_members_function from './list-project-members.function';
import { list_project_members_query_zod } from './list-project-members.query.schema';
import { list_project_members_body_zod }  from './list-project-members.body.schema';
import { list_project_members_tests }     from './list-project-members.test';

export const list_project_members_details: ApiDetails = {
  module:              'Projects',
  api_name:            'List Project Members',
  api_description:     'Returns all members of a project (Step 5 of the project creation wizard) with designation, stakeholder role, and authority rank.',
  method:              'get',
  path:                '/api/projects/{project_id}/members',
  query_schema:        list_project_members_query_zod,
  body_schema:         list_project_members_body_zod,
  execution_function:  list_project_members_function as any,
  tests:               list_project_members_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
