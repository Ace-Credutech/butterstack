import { Error_Interface } from '@config/interfaces/error.interface';
import { Project } from '@models/project.model';
import { ProjectInitStep } from '@models/project-init-step.model';
import { get_init_state_function_params, get_init_state_function_return } from './get-init-state.interface';

const STEP_COUNT = 6;

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_step_rows = async (project_id: string) =>
  ProjectInitStep.findAll({ where: { project_id }, order: [['step', 'ASC']] });

const shape_step = (step: number, row: ProjectInitStep | undefined) => ({
  step,
  status:     row ? row.status : null,
  updated_at: row ? row.updated_at : null,
});

const project_steps_view = (rows: ProjectInitStep[]) => {
  const by_step = new Map(rows.map(r => [r.step, r]));
  return Array.from({ length: STEP_COUNT }, (_, i) => shape_step(i + 1, by_step.get(i + 1)));
};

const get_init_state_function = async (data: get_init_state_function_params): Promise<get_init_state_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const rows  = await fetch_step_rows(data.project_id);
  const steps = project_steps_view(rows);

  return {
    code:    200,
    message: 'init-state',
    data: {
      project_id:          project.id,
      project_name:        project.name,
      project_slug:        project.slug,
      project_status:      project.status,
      steps,
      skeleton_revisions:  [],
    },
  };
};

export default get_init_state_function;
