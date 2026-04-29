import { z } from 'zod';
import { ProjectInitStep, ProjectInitStepStatus } from '@models/project-init-step.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  step:   z.number().int().min(1).max(6),
  status: z.enum(['in-progress', 'done', 'stale']),
});

type Payload = z.infer<typeof payload_schema>;

const find_existing_step = async (project_id: string, step: number, transaction: any) =>
  ProjectInitStep.findOne({ where: { project_id, step }, transaction });

const upsert_step = async (
  project_id: string,
  step: number,
  status: ProjectInitStepStatus,
  user_id: string,
  transaction: any,
) => {
  const existing = await find_existing_step(project_id, step, transaction);
  if (existing) {
    await existing.update({ status, updated_by: user_id }, { transaction });
    return { row: existing, prev_status: existing.status as ProjectInitStepStatus };
  }
  const created = await ProjectInitStep.create({
    project_id,
    step,
    status,
    updated_by: user_id,
  } as any, { transaction });
  return { row: created, prev_status: null as ProjectInitStepStatus | null };
};

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const { row, prev_status } = await upsert_step(
    scope.project_id,
    payload.step,
    payload.status,
    ctx.actor.id,
    transaction,
  );

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'project.init.step',
    entity:      'ProjectInitStep',
    entity_id:   `${scope.project_id}:${payload.step}`,
    description: `Step ${payload.step} → ${payload.status}`,
  }, transaction);

  return {
    state_delta: {
      init_step: {
        project_id:  scope.project_id,
        step:        row.step,
        status:      row.status,
        prev_status,
        flipped_to_stale: prev_status === 'done' && row.status === 'stale',
      },
    },
    affected_entities: { projects: [scope.project_id] },
  };
};

export const project_init_step_handler: EventHandlerDetails = {
  type:           'project.init.step',
  payload_schema,
  handler:        handler as any,
};
