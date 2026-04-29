import { Error_Interface } from '@config/interfaces/error.interface';
import { Project } from '@models/project.model';
import { ProjectRole } from '@models/project-role.model';
import { ProjectRolePermission } from '@models/project-role-permission.model';
import { get_rbac_matrix_function_params, get_rbac_matrix_function_return } from './get-rbac-matrix.interface';

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_roles = async (project_id: string) =>
  ProjectRole.findAll({ where: { project_id }, order: [['created_at', 'ASC']] });

const fetch_cells = async (project_id: string) =>
  ProjectRolePermission.findAll({ where: { project_id }, order: [['created_at', 'ASC']] });

const shape_role = (r: ProjectRole) => ({
  id:   r.id,
  name: r.name,
});

const shape_cell = (c: ProjectRolePermission) => ({
  id:             c.id,
  role_id:        c.role_id,
  permission_key: c.permission_key,
  feature_id:     c.feature_id,
  allow:          c.allow,
});

const collect_permission_keys = (cells: ProjectRolePermission[]): string[] => {
  const set = new Set<string>();
  for (const c of cells) set.add(c.permission_key);
  return Array.from(set).sort();
};

const get_rbac_matrix_function = async (data: get_rbac_matrix_function_params): Promise<get_rbac_matrix_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const [roles, cells] = await Promise.all([
    fetch_roles(data.project_id),
    fetch_cells(data.project_id),
  ]);

  return {
    code:    200,
    message: 'rbac matrix',
    data: {
      project_id:      project.id,
      roles:           roles.map(shape_role),
      permission_keys: collect_permission_keys(cells),
      cells:           cells.map(shape_cell),
    },
  };
};

export default get_rbac_matrix_function;
