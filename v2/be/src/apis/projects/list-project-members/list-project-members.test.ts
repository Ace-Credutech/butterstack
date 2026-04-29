import { list_project_members_tests_interface } from './list-project-members.interface';

export const list_project_members_tests: list_project_members_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null, project_id: '00000000-0000-0000-0000-000000000000' } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
