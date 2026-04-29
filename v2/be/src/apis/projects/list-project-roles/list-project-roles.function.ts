import { Error_Interface } from '@config/interfaces/error.interface';
import { Project } from '@models/project.model';
import { ProjectRole } from '@models/project-role.model';
import { list_project_roles_function_params, list_project_roles_function_return } from './list-project-roles.interface';

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_roles = async (project_id: string) =>
  ProjectRole.findAll({ where: { project_id }, order: [['created_at', 'ASC']] });

const shape_role = (r: ProjectRole) => ({
  id:          r.id,
  project_id:  r.project_id,
  name:        r.name,
  description: r.description,
  created_at:  r.created_at,
  updated_at:  r.updated_at,
});

const list_project_roles_function = async (data: list_project_roles_function_params): Promise<list_project_roles_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const roles = await fetch_roles(data.project_id);

  return {
    code:    200,
    message: 'project roles',
    data: {
      project_id: project.id,
      items:      roles.map(shape_role),
    },
  };
};

export default list_project_roles_function;
