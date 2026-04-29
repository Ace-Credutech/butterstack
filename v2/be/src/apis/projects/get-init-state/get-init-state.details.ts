import { ApiDetails } from '@setup/api/api.interface';
import get_init_state_function from './get-init-state.function';
import { get_init_state_query_zod } from './get-init-state.query.schema';
import { get_init_state_body_zod }  from './get-init-state.body.schema';
import { get_init_state_tests }     from './get-init-state.test';

export const get_init_state_details: ApiDetails = {
  module:              'Projects',
  api_name:            'Get Init State',
  api_description:     'Returns the resumable stepper state (per-step status) and any skeleton revisions for a project.',
  method:              'get',
  path:                '/api/projects/{project_id}/init-state',
  query_schema:        get_init_state_query_zod,
  body_schema:         get_init_state_body_zod,
  execution_function:  get_init_state_function as any,
  tests:               get_init_state_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
