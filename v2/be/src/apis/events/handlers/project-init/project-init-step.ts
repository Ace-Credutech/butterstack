import { z } from 'zod';
import { ProjectInitStep, ProjectInitStepStatus } from '@models/project-init-step.model';
import { ProjectInitialContext } from '@models/project-initial-context.model';
import { log_activity } from '@config/common/activity-log-function';
import { get_queue } from '@setup/queue/queue';
import type { InitialContextBuildPayload } from '@src/workers/initial-context/initial-context.worker';
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

// When step 2 (Documents) transitions into 'done', kick off the Phase B.5
// initial-context build. Handled outside the txn — failures here must not
// roll back the step update. Idempotency: BullMQ job_id = `initial-context-{project_id}`
// + the worker's internal route checks status='ready'/'building' and short-circuits.
const queue_initial_context_if_step2_done = (
  args: { project_id: string; user_id: string; step: number; status: ProjectInitStepStatus; prev_status: ProjectInitStepStatus | null; trace_id: string },
): void => {
  if (args.step !== 2 || args.status !== 'done') return;

  // Pre-create the row in 'pending' so the FE can show "Building…" before the worker picks up.
  void ProjectInitialContext.findOrCreate({
    where:    { project_id: args.project_id },
    defaults: { project_id: args.project_id, status: 'pending' } as any,
  }).then(([row, created]) => {
    // If it already exists in 'ready'/'failed' from a prior run, reset to pending so we rebuild.
    if (!created && row.status !== 'building') {
      return row.update({ status: 'pending', error_message: null });
    }
  }).catch(() => {});

  void get_queue().publish<InitialContextBuildPayload>(
    'projects',
    'project.initial-context.build',
    { project_id: args.project_id, user_id: args.user_id, trace_id: args.trace_id },
    { delay_ms: 1000, job_id: `initial-context-${args.project_id}` },
  ).catch(() => {});
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

  queue_initial_context_if_step2_done({
    project_id:  scope.project_id,
    user_id:     ctx.actor.id,
    step:        row.step,
    status:      row.status as ProjectInitStepStatus,
    prev_status,
    trace_id:    ctx.trace_id,
  });

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
