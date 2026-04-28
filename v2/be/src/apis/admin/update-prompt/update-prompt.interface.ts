import { ExecutionResult } from '@setup/api/api.interface';
export interface update_prompt_function_params {
  user:            any;
  prompt_id:       string;
  model?:          string;
  temperature?:    number;
  max_tokens?:     number;
  response_format?: string;
  system_text?:    string;
  user_template?:  string;
  notes?:          string;
}
export type     update_prompt_function_return = ExecutionResult;
export interface update_prompt_tests_interface { name: string; input: update_prompt_function_params; check_output?: (i: any, o: any) => void }
