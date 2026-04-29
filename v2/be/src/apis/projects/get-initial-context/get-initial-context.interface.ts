import { ExecutionResult } from '@setup/api/api.interface';

export interface get_initial_context_function_params {
  user:       any;
  project_id: string;
}

export type get_initial_context_function_return = ExecutionResult;

export interface get_initial_context_tests_interface {
  name:          string;
  input:         get_initial_context_function_params;
  check_output?: (input: any, output: any) => void;
}
