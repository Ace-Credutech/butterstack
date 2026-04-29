import { ExecutionResult } from '@setup/api/api.interface';

export interface list_session_messages_function_params {
  user:       any;
  session_id: string;
}

export type list_session_messages_function_return = ExecutionResult;

export interface list_session_messages_tests_interface {
  name:          string;
  input:         list_session_messages_function_params;
  check_output?: (input: any, output: any) => void;
}
