import { Transaction } from 'sequelize';
import { ZodObject } from 'zod';
import { Error_Interface } from '@config/interfaces/error.interface';

export type EventScope = {
  project_id:  string;
  module_id?:  string;
  feature_id?: string;
  page_id?:    string;
  session_id?: string;
};

export type EventSource = 'user' | 'ai' | 'system';

export type EventEnvelope<P = Record<string, unknown>> = {
  type:                     string;
  payload:                  P;
  scope:                    EventScope;
  source:                   EventSource;
  idempotency_key:          string;
  expected_version?:        number;
  override_target_event_id?: string;
  event_version?:           number;
};

export type EventContext = {
  actor:      any;
  trace_id:   string;
  sequence_no: number;
  event_id:    string;
};

export type EventResult = {
  state_delta?:        Record<string, unknown>;
  affected_entities?:  Record<string, unknown>;
  jobs_to_enqueue?:    { queue: string; name: string; payload: unknown }[];
};

export type EventHandler<P = Record<string, unknown>> = (
  payload:     P,
  scope:       EventScope,
  ctx:         EventContext,
  transaction: Transaction,
) => Promise<EventResult | Error_Interface>;

export type EventHandlerDetails = {
  type:              string;
  payload_schema:    ZodObject<any>;
  handler:           EventHandler<any>;
  required_authority_rank?: number;
};
