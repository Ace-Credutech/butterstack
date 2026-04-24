import { post_event_tests_interface } from './post-event.interface';

export const post_event_tests: post_event_tests_interface[] = [
  {
    name:  'Rejects unknown event type',
    input: {
      type: 'unknown.event',
      payload: {},
      scope: { project_id: '00000000-0000-4000-8000-000000000001' } as any,
      source: 'user',
      idempotency_key: '00000000-0000-4000-8000-000000000099',
      event_version: 1,
    } as any,
    check_output: (_i, o) => { if (o.code !== 422) throw new Error('expected 422 for unknown event type'); },
  },
];
