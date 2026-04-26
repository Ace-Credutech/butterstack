import { ExecutionResult } from '@setup/api/api.interface';

export interface update_role_function_params {
  user:         any;
  id:           string;
  name?:        string;
  description?: string;
  permissions?: Record<string, unknown>;
}

export type update_role_function_return = ExecutionResult;

export interface update_role_tests_interface {
  name:          string;
  input:         update_role_function_params;
  check_output?: (input: any, output: any) => void;
}
