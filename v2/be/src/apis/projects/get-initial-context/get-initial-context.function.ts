import { Error_Interface } from '@config/interfaces/error.interface';
import { Project }                    from '@models/project.model';
import { ProjectInitialContext }      from '@models/project-initial-context.model';
import { get_initial_context_function_params, get_initial_context_function_return } from './get-initial-context.interface';

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_context = async (project_id: string) =>
  ProjectInitialContext.findOne({ where: { project_id } });

const shape_response = (project_id: string, ctx: ProjectInitialContext | null) => ({
  project_id,
  status:        ctx?.status        ?? 'absent',
  json_payload:  ctx?.json_payload  ?? null,
  markdown_text: ctx?.markdown_text ?? null,
  generated_at:  ctx?.generated_at  ?? null,
  prompt_run_id: ctx?.prompt_run_id ?? null,
  error_message: ctx?.error_message ?? null,
});

const get_initial_context_function = async (data: get_initial_context_function_params): Promise<get_initial_context_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const ctx = await fetch_context(data.project_id);

  return {
    code:    200,
    message: 'project initial context',
    data:    shape_response(data.project_id, ctx),
  };
};

export default get_initial_context_function;
