import { ExecutionResult } from '@setup/api/api.interface';

export interface health_live_function_params {}

export type health_live_function_return = ExecutionResult;

export interface health_live_tests_interface {
  name:          string;
  input:         health_live_function_params;
  check_output?: (input: health_live_function_params, output: health_live_function_return) => void;
}
