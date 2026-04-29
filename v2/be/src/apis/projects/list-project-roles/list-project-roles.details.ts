import { ApiDetails } from '@setup/api/api.interface';
import list_project_roles_function from './list-project-roles.function';
import { list_project_roles_query_zod } from './list-project-roles.query.schema';
import { list_project_roles_body_zod }  from './list-project-roles.body.schema';
import { list_project_roles_tests }     from './list-project-roles.test';

export const list_project_roles_details: ApiDetails = {
  module:              'Projects',
  api_name:            'List Project Roles',
  api_description:     'Returns all app-personas (roles) defined for a project. Step 3 of the project creation wizard.',
  method:              'get',
  path:                '/api/projects/{project_id}/roles',
  query_schema:        list_project_roles_query_zod,
  body_schema:         list_project_roles_body_zod,
  execution_function:  list_project_roles_function as any,
  tests:               list_project_roles_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
