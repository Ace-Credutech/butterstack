import { ExecutionResult } from '@setup/api/api.interface';

export interface list_projects_function_params { user: any; limit?: number; cursor?: string }

export type list_projects_function_return = ExecutionResult;

export interface list_projects_tests_interface {
  name:          string;
  input:         list_projects_function_params;
  check_output?: (input: any, output: any) => void;
}
