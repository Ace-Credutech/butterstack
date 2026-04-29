import { ApiDetails } from '@setup/api/api.interface';
import get_initial_context_function from './get-initial-context.function';
import { get_initial_context_query_zod } from './get-initial-context.query.schema';
import { get_initial_context_body_zod }  from './get-initial-context.body.schema';
import { get_initial_context_tests }     from './get-initial-context.test';

export const get_initial_context_details: ApiDetails = {
  module:              'Projects',
  api_name:            'Get Project Initial Context',
  api_description:     'Returns the AI-generated initial context (JSON + markdown) built after Step 2 closes. Status is `absent` until the worker creates the row, then `pending` → `building` → `ready` (or `failed`).',
  method:              'get',
  path:                '/api/projects/{project_id}/initial-context',
  query_schema:        get_initial_context_query_zod,
  body_schema:         get_initial_context_body_zod,
  execution_function:  get_initial_context_function as any,
  tests:               get_initial_context_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
