import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_login_function_params {
  email:    string;
  password: string;
}

export type auth_login_function_return = ExecutionResult;

export interface auth_login_tests_interface {
  name:          string;
  input:         auth_login_function_params;
  check_output?: (input: auth_login_function_params, output: auth_login_function_return) => void;
}
