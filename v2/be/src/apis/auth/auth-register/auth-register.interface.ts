import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_register_function_params {
  email:       string;
  password:    string;
  first_name?: string;
  last_name?:  string;
}

export type auth_register_function_return = ExecutionResult;

export interface auth_register_tests_interface {
  name:          string;
  input:         auth_register_function_params;
  check_output?: (input: auth_register_function_params, output: auth_register_function_return) => void;
}
