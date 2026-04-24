import { ApiDetails } from '@setup/api/api.interface';
import post_event_function from './post-event.function';
import { post_event_query_zod } from './post-event.query.schema';
import { post_event_body_zod } from './post-event.body.schema';
import { post_event_tests } from './post-event.test';

export const post_event_details: ApiDetails = {
  module:              'Events',
  api_name:            'Post Event',
  api_description:     'Single write surface. Body is a typed event envelope; dispatcher routes to a registered handler.',
  method:              'post',
  path:                '/api/events',
  query_schema:        post_event_query_zod,
  body_schema:         post_event_body_zod,
  execution_function:  post_event_function as any,
  tests:               post_event_tests,
  roles:               ['Member'],
  uses_transaction:    true,
};
