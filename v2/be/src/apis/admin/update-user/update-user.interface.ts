import { ExecutionResult } from '@setup/api/api.interface';

export interface update_user_function_params {
  user:       any;
  id:         string;
  role_slug?: string;
  is_active?: boolean;
}

export type update_user_function_return = ExecutionResult;

export interface update_user_tests_interface {
  name:          string;
  input:         update_user_function_params;
  check_output?: (input: any, output: any) => void;
}
