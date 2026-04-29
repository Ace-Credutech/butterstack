import { list_session_messages_tests_interface } from './list-session-messages.interface';

export const list_session_messages_tests: list_session_messages_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null, session_id: '00000000-0000-0000-0000-000000000000' } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
