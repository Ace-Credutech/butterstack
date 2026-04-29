import { ApiDetails } from '@setup/api/api.interface';
import get_rbac_matrix_function from './get-rbac-matrix.function';
import { get_rbac_matrix_query_zod } from './get-rbac-matrix.query.schema';
import { get_rbac_matrix_body_zod }  from './get-rbac-matrix.body.schema';
import { get_rbac_matrix_tests }     from './get-rbac-matrix.test';

export const get_rbac_matrix_details: ApiDetails = {
  module:              'Projects',
  api_name:            'Get Project RBAC Matrix',
  api_description:     'Returns roles × permission_keys × feature_id grid (D-5). Until Phase F lands features, all cells live with feature_id = null.',
  method:              'get',
  path:                '/api/projects/{project_id}/rbac-matrix',
  query_schema:        get_rbac_matrix_query_zod,
  body_schema:         get_rbac_matrix_body_zod,
  execution_function:  get_rbac_matrix_function as any,
  tests:               get_rbac_matrix_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
