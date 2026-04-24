import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_refresh_function_params { refresh_token: string }

export type auth_refresh_function_return = ExecutionResult;

export interface auth_refresh_tests_interface {
  name:          string;
  input:         auth_refresh_function_params;
  check_output?: (input: auth_refresh_function_params, output: auth_refresh_function_return) => void;
}
