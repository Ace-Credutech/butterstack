import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_logout_function_params { user: any; _session_id?: string }

export type auth_logout_function_return = ExecutionResult;

export interface auth_logout_tests_interface {
  name:          string;
  input:         auth_logout_function_params;
  check_output?: (input: auth_logout_function_params, output: auth_logout_function_return) => void;
}
