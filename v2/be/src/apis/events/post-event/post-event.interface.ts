import { ExecutionResult } from '@setup/api/api.interface';
import { EventScope, EventSource } from '../event.types';

export interface post_event_function_params {
  type:                      string;
  payload:                   Record<string, unknown>;
  scope:                     EventScope;
  source:                    EventSource;
  idempotency_key:           string;
  expected_version?:         number;
  override_target_event_id?: string;
  event_version?:            number;
  user:                      any;
  trace_id:                  string;
}

export type post_event_function_return = ExecutionResult;

export interface post_event_tests_interface {
  name:          string;
  input:         Partial<post_event_function_params>;
  check_output?: (input: any, output: any) => void;
}
