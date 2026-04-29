import { z } from 'zod';
import { Project } from '@models/project.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  name:  z.string().min(1),
  slug:  z.string().min(1),
  brief: z.string().optional(),
});

type Payload = z.infer<typeof payload_schema>;

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const existing = await Project.findOne({ where: { slug: payload.slug }, transaction });
  if (existing) return { code: 409, message: `Project with slug "${payload.slug}" already exists` };

  const project = await Project.create({
    id:       scope.project_id,
    owner_id: ctx.actor.id,
    name:     payload.name,
    slug:     payload.slug,
    brief:    payload.brief ?? null,
    status:   'draft',
  } as any, { transaction });

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'project.create',
    entity:      'Project',
    entity_id:   project.id,
    description: `Created project ${project.name} (draft)`,
  }, transaction);

  return {
    state_delta: { project: { id: project.id, name: project.name, slug: project.slug, status: project.status } },
    affected_entities: { projects: [project.id] },
  };
};

export const project_create_handler: EventHandlerDetails = {
  type:           'project.create',
  payload_schema,
  handler:        handler as any,
};
