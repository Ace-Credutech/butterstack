import { ApiDetails } from '@setup/api/api.interface';
import get_event_function from './get-event.function';
import { get_event_query_zod } from './get-event.query.schema';
import { get_event_body_zod } from './get-event.body.schema';
import { get_event_tests } from './get-event.test';

export const get_event_details: ApiDetails = {
  module:              'Events',
  api_name:            'Get Event',
  api_description:     'Load a single event by id',
  method:              'get',
  path:                '/api/events/{id}',
  query_schema:        get_event_query_zod,
  body_schema:         get_event_body_zod,
  execution_function:  get_event_function as any,
  tests:               get_event_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
