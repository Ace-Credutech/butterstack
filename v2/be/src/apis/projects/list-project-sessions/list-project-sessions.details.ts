import { ApiDetails } from '@setup/api/api.interface';
import list_project_sessions_function from './list-project-sessions.function';
import { list_project_sessions_query_zod } from './list-project-sessions.query.schema';
import { list_project_sessions_body_zod }  from './list-project-sessions.body.schema';
import { list_project_sessions_tests }     from './list-project-sessions.test';

export const list_project_sessions_details: ApiDetails = {
  module:              'Projects',
  api_name:            'List Project Sessions',
  api_description:     'Returns multi-participant chat sessions for a project (Step 4 of the project creation wizard). Optional `kind` filter (clarification|quiz|review).',
  method:              'get',
  path:                '/api/projects/{project_id}/sessions',
  query_schema:        list_project_sessions_query_zod,
  body_schema:         list_project_sessions_body_zod,
  execution_function:  list_project_sessions_function as any,
  tests:               list_project_sessions_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
