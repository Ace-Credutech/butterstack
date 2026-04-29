import { get_rbac_matrix_tests_interface } from './get-rbac-matrix.interface';

export const get_rbac_matrix_tests: get_rbac_matrix_tests_interface[] = [
  {
    name:  'Rejects when unauthenticated',
    input: { user: null, project_id: '00000000-0000-0000-0000-000000000000' } as any,
    check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); },
  },
];
