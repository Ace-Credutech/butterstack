import { ExecutionResult } from '@setup/api/api.interface';

export interface get_event_function_params { id: string }
export type    get_event_function_return = ExecutionResult;

export interface get_event_tests_interface {
  name:          string;
  input:         get_event_function_params;
  check_output?: (input: any, output: any) => void;
}
