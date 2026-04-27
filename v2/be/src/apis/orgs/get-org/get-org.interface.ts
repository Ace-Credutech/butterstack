import { ExecutionResult } from '@setup/api/api.interface';

export interface get_org_function_params { user: any; org_id: string }

export type get_org_function_return = ExecutionResult;

export interface get_org_tests_interface {
  name:          string;
  input:         get_org_function_params;
  check_output?: (input: any, output: any) => void;
}
