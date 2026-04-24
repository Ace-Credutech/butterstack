import { get_event_tests_interface } from './get-event.interface';

export const get_event_tests: get_event_tests_interface[] = [
  {
    name:  'Returns 404 for missing event',
    input: { id: '00000000-0000-4000-8000-00000000ffff' },
    check_output: (_i, o) => { if (o.code !== 404) throw new Error('expected 404'); },
  },
];
