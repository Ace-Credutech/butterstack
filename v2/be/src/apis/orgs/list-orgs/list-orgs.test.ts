import { list_orgs_tests_interface } from './list-orgs.interface';

export const list_orgs_tests: list_orgs_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
