import { ApiDetails } from '@setup/api/api.interface';
import get_prompt_function from './get-prompt.function';
import { get_prompt_query_zod } from './get-prompt.query.schema';
import { get_prompt_body_zod }  from './get-prompt.body.schema';
import { get_prompt_tests }     from './get-prompt.test';

export const get_prompt_details: ApiDetails = {
  module:           'Admin',
  sub_module:       'Prompts',
  api_name:         'Get Prompt',
  api_description:  'Returns a single prompt with full current version details',
  method:           'get',
  path:             '/api/admin/prompts/{prompt_id}',
  query_schema:     get_prompt_query_zod,
  body_schema:      get_prompt_body_zod,
  execution_function: get_prompt_function as any,
  tests:            get_prompt_tests,
  roles:            ['Member'],
  uses_transaction: false,
};
