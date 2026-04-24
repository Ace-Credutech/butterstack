import { list_projects_tests_interface } from './list-projects.interface';

export const list_projects_tests: list_projects_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
