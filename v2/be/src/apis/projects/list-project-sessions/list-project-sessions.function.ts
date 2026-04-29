import { Error_Interface } from '@config/interfaces/error.interface';
import { Project } from '@models/project.model';
import { Session } from '@models/session.model';
import { SessionParticipant } from '@models/session-participant.model';
import { list_project_sessions_function_params, list_project_sessions_function_return } from './list-project-sessions.interface';

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_sessions = async (project_id: string, kind?: string) =>
  Session.findAll({
    where: kind ? { project_id, kind } : { project_id },
    include: [{ model: SessionParticipant, as: 'participants' }],
    order:  [['created_at', 'DESC']],
  });

const shape_participant = (p: SessionParticipant) => ({
  id:           p.id,
  kind:         p.kind,
  user_id:      p.user_id,
  member_id:    p.member_id,
  display_name: p.display_name,
  joined_at:    p.joined_at,
  left_at:      p.left_at,
});

const shape_session = (s: Session & { participants?: SessionParticipant[] }) => ({
  id:           s.id,
  project_id:   s.project_id,
  kind:         s.kind,
  title:        s.title,
  started_by:   s.started_by,
  ended_at:     s.ended_at,
  created_at:   s.created_at,
  participants: (s.participants ?? []).map(shape_participant),
});

const list_project_sessions_function = async (data: list_project_sessions_function_params): Promise<list_project_sessions_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const sessions = await fetch_sessions(data.project_id, data.kind);

  return {
    code:    200,
    message: 'project sessions',
    data: {
      project_id: project.id,
      kind:       data.kind ?? null,
      items:      sessions.map(shape_session),
    },
  };
};

export default list_project_sessions_function;
