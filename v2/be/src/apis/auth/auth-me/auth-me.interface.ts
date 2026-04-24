import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_me_function_params { user: any }

export type auth_me_function_return = ExecutionResult;

export interface auth_me_tests_interface {
  name:          string;
  input:         auth_me_function_params;
  check_output?: (input: auth_me_function_params, output: auth_me_function_return) => void;
}
