import { ExecutionResult } from '@setup/api/api.interface';

export interface list_orgs_function_params { user: any }

export type list_orgs_function_return = ExecutionResult;

export interface list_orgs_tests_interface {
  name:          string;
  input:         list_orgs_function_params;
  check_output?: (input: any, output: any) => void;
}
