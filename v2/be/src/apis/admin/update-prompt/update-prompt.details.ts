import { ApiDetails } from '@setup/api/api.interface';
import update_prompt_function from './update-prompt.function';
import { update_prompt_query_zod } from './update-prompt.query.schema';
import { update_prompt_body_zod }  from './update-prompt.body.schema';
import { update_prompt_tests }     from './update-prompt.test';

export const update_prompt_details: ApiDetails = {
  module:           'Admin',
  sub_module:       'Prompts',
  api_name:         'Update Prompt',
  api_description:  'Saves a new version of the prompt — supersedes current, bumps version number',
  method:           'put',
  path:             '/api/admin/prompts/{prompt_id}',
  query_schema:     update_prompt_query_zod,
  body_schema:      update_prompt_body_zod,
  execution_function: update_prompt_function as any,
  tests:            update_prompt_tests,
  roles:            ['Member'],
  uses_transaction: true,
};
