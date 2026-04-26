import { ExecutionResult } from '@setup/api/api.interface';

export interface create_role_function_params {
  user:        any;
  slug:        string;
  name:        string;
  description?: string;
  permissions: Record<string, unknown>;
}

export type create_role_function_return = ExecutionResult;

export interface create_role_tests_interface {
  name:          string;
  input:         create_role_function_params;
  check_output?: (input: any, output: any) => void;
}
