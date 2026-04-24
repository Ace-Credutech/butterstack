import { ExecutionResult } from '@setup/api/api.interface';

export interface health_ready_function_params {}

export type health_ready_function_return = ExecutionResult;

export interface health_ready_tests_interface {
  name:          string;
  input:         health_ready_function_params;
  check_output?: (input: health_ready_function_params, output: health_ready_function_return) => void;
}
