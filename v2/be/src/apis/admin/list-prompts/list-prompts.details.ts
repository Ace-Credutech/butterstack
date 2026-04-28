import { ApiDetails } from '@setup/api/api.interface';
import list_prompts_function from './list-prompts.function';
import { list_prompts_query_zod } from './list-prompts.query.schema';
import { list_prompts_body_zod }  from './list-prompts.body.schema';
import { list_prompts_tests }     from './list-prompts.test';

export const list_prompts_details: ApiDetails = {
  module:           'Admin',
  sub_module:       'Prompts',
  api_name:         'List Prompts',
  api_description:  'Lists all prompts with their current version summary',
  method:           'get',
  path:             '/api/admin/prompts',
  query_schema:     list_prompts_query_zod,
  body_schema:      list_prompts_body_zod,
  execution_function: list_prompts_function as any,
  tests:            list_prompts_tests,
  roles:            ['Member'],
  uses_transaction: false,
};
