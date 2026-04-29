import { Error_Interface } from '@config/interfaces/error.interface';
import { Project } from '@models/project.model';
import { ProjectMember } from '@models/project-member.model';
import { list_project_members_function_params, list_project_members_function_return } from './list-project-members.interface';

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_members = async (project_id: string) =>
  ProjectMember.findAll({ where: { project_id }, order: [['authority_rank', 'ASC'], ['created_at', 'ASC']] });

const shape_member = (m: ProjectMember) => ({
  id:               m.id,
  project_id:       m.project_id,
  user_id:          m.user_id,
  email:            m.email,
  name:             m.name,
  designation:      m.designation,
  stakeholder_role: m.stakeholder_role,
  authority_rank:   m.authority_rank,
  invited_by:       m.invited_by,
  created_at:       m.created_at,
  updated_at:       m.updated_at,
});

const list_project_members_function = async (data: list_project_members_function_params): Promise<list_project_members_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const members = await fetch_members(data.project_id);

  return {
    code:    200,
    message: 'project members',
    data: {
      project_id: project.id,
      items:      members.map(shape_member),
    },
  };
};

export default list_project_members_function;
