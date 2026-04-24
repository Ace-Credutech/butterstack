import { z } from 'zod';
import { Project } from '@models/project.model';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({});

const handler: EventHandler<{}> = async (_payload, scope, _ctx, transaction) => {
  const project = await Project.findByPk(scope.project_id, { transaction });
  if (!project) return { code: 404, message: `Project ${scope.project_id} not found` };
  await project.destroy({ transaction });
  return {
    state_delta:       { project: { id: project.id, deleted: true } },
    affected_entities: { projects: [project.id] },
  };
};

export const project_delete_handler: EventHandlerDetails = {
  type:           'project.delete',
  payload_schema,
  handler:        handler as any,
};
