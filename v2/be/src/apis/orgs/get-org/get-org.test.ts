import { get_org_tests_interface } from './get-org.interface';

export const get_org_tests: get_org_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null, org_id: 'any' } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
