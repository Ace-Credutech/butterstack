import { ExecutionResult } from '@setup/api/api.interface';

export interface list_users_function_params {
  user:      any;
  q?:        string;
  role_slug?: string;
  is_active?: 'true' | 'false';
  sort:      'created_at' | 'name' | 'email';
  dir:       'asc' | 'desc';
  page:      number;
  size:      number;
}

export type list_users_function_return = ExecutionResult;

export interface list_users_tests_interface {
  name:          string;
  input:         list_users_function_params;
  check_output?: (input: any, output: any) => void;
}
