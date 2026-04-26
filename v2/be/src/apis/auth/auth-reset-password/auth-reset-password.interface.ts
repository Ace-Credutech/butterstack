import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_reset_password_function_params {
  user:         any;
  token:        string;
  new_password: string;
}

export type auth_reset_password_function_return = ExecutionResult;

export interface auth_reset_password_tests_interface {
  name:          string;
  input:         auth_reset_password_function_params;
  check_output?: (input: any, output: any) => void;
}
