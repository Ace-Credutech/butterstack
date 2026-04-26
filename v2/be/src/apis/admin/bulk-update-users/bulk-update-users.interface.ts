import { ExecutionResult } from '@setup/api/api.interface';

export type BulkUpsertOp = {
  email:       string;
  role_slug?:  string;
  is_active?:  boolean;
  name?:       string;
  first_name?: string;
  last_name?:  string;
  password?:   string;
};

export interface bulk_update_users_function_params {
  user:    any;
  updates: BulkUpsertOp[];
}

export type bulk_update_users_function_return = ExecutionResult;

export interface bulk_update_users_tests_interface {
  name:          string;
  input:         bulk_update_users_function_params;
  check_output?: (input: any, output: any) => void;
}
