import { ExecutionResult } from '@setup/api/api.interface';

export interface auth_forgot_password_function_params {
  user:          any;
  email:         string;
  redirect_uri?: string;
}

export type auth_forgot_password_function_return = ExecutionResult;

export interface auth_forgot_password_tests_interface {
  name:          string;
  input:         auth_forgot_password_function_params;
  check_output?: (input: any, output: any) => void;
}
