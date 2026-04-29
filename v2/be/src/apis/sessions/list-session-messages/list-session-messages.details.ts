import { ApiDetails } from '@setup/api/api.interface';
import list_session_messages_function from './list-session-messages.function';
import { list_session_messages_query_zod } from './list-session-messages.query.schema';
import { list_session_messages_body_zod }  from './list-session-messages.body.schema';
import { list_session_messages_tests }     from './list-session-messages.test';

export const list_session_messages_details: ApiDetails = {
  module:              'Sessions',
  api_name:            'List Session Messages',
  api_description:     'Returns the full message thread + participants for a session (Phase E1 chat shell).',
  method:              'get',
  path:                '/api/sessions/{session_id}/messages',
  query_schema:        list_session_messages_query_zod,
  body_schema:         list_session_messages_body_zod,
  execution_function:  list_session_messages_function as any,
  tests:               list_session_messages_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
