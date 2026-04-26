import { ExecutionResult } from '@setup/api/api.interface';

export interface list_roles_function_params { user: any }
export type    list_roles_function_return = ExecutionResult;
export interface list_roles_tests_interface {
  name:          string;
  input:         list_roles_function_params;
  check_output?: (input: any, output: any) => void;
}
