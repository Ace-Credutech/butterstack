import { get_initial_context_tests_interface } from './get-initial-context.interface';

export const get_initial_context_tests: get_initial_context_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null, project_id: '00000000-0000-0000-0000-000000000000' } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
