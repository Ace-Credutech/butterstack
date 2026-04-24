import { z } from 'zod';
import { Project } from '@models/project.model';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  name:  z.string().min(1).optional(),
  brief: z.string().optional(),
});

type Payload = z.infer<typeof payload_schema>;

const ensure_has_update = (payload: Payload) => {
  if (payload.name === undefined && payload.brief === undefined) throw { code: 422, message: 'name or brief must be provided' };
};

const handler: EventHandler<Payload> = async (payload, scope, _ctx, transaction) => {
  ensure_has_update(payload);
  const project = await Project.findByPk(scope.project_id, { transaction });
  if (!project) return { code: 404, message: `Project ${scope.project_id} not found` };
  await project.update({ name: payload.name ?? project.name, brief: payload.brief ?? project.brief }, { transaction });
  return {
    state_delta: { project: { id: project.id, name: project.name, brief: project.brief } },
    affected_entities: { projects: [project.id] },
  };
};

export const project_update_handler: EventHandlerDetails = {
  type:           'project.update',
  payload_schema,
  handler:        handler as any,
};
