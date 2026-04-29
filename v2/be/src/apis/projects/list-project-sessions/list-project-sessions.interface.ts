import { ExecutionResult } from '@setup/api/api.interface';
import type { SessionKind } from '@models/session.model';

export interface list_project_sessions_function_params {
  user:       any;
  project_id: string;
  kind?:      SessionKind;
}

export type list_project_sessions_function_return = ExecutionResult;

export interface list_project_sessions_tests_interface {
  name:          string;
  input:         list_project_sessions_function_params;
  check_output?: (input: any, output: any) => void;
}
