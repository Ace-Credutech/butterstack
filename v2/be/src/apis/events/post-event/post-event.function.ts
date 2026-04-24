import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Error_Interface } from '@config/interfaces/error.interface';
import { sequelize } from '@setup/sequelize';
import { Event } from '@models/event.model';
import { ProjectSequence } from '@models/project-sequence.model';
import { dispatch_event } from '../dispatcher';
import { EventContext, EventEnvelope } from '../event.types';
import { post_event_function_params, post_event_function_return } from './post-event.interface';

const find_existing_by_idempotency = async (project_id: string, idempotency_key: string, transaction: Transaction) =>
  Event.findOne({ where: { project_id, idempotency_key }, transaction });

const claim_next_sequence_no = async (project_id: string, transaction: Transaction): Promise<number> => {
  const [row] = await ProjectSequence.findOrCreate({ where: { project_id }, defaults: { project_id, last_seq: 0 }, transaction });
  const locked = await ProjectSequence.findByPk(row.project_id, { transaction, lock: Transaction.LOCK.UPDATE });
  if (!locked) throw { code: 500, message: 'Failed to lock project_sequences row' };
  const next   = Number(locked.last_seq) + 1;
  await locked.update({ last_seq: next }, { transaction });
  return next;
};

const persist_event = async (args: { envelope: EventEnvelope; ctx: EventContext; affected: Record<string, unknown> }, transaction: Transaction): Promise<Event> => {
  return Event.create({
    id:                       args.ctx.event_id,
    project_id:               args.envelope.scope.project_id,
    sequence_no:              args.ctx.sequence_no,
    actor_id:                 args.ctx.actor?.id ?? null,
    authority_rank:           args.ctx.actor?.authority_rank ?? null,
    type:                     args.envelope.type,
    payload_json:             args.envelope.payload,
    scope_json:               args.envelope.scope as any,
    affected_entities_json:   args.affected,
    source:                   args.envelope.source,
    idempotency_key:          args.envelope.idempotency_key,
    expected_version:         args.envelope.expected_version ?? null,
    override_target_event_id: args.envelope.override_target_event_id ?? null,
    event_version:            args.envelope.event_version ?? 1,
    trace_id:                 args.ctx.trace_id,
  } as any, { transaction });
};

const build_envelope = (data: post_event_function_params): EventEnvelope => ({
  type:                     data.type,
  payload:                  data.payload,
  scope:                    data.scope,
  source:                   data.source,
  idempotency_key:          data.idempotency_key,
  expected_version:         data.expected_version,
  override_target_event_id: data.override_target_event_id,
  event_version:            data.event_version ?? 1,
});

const envelope_matches = (existing: Event, envelope: EventEnvelope): boolean => existing.type === envelope.type;

const shape_idempotent_reply = (existing: Event): post_event_function_return => ({
  code:    200,
  message: 'idempotent replay',
  data: {
    id:           existing.id,
    sequence_no:  Number(existing.sequence_no),
    applied_at:   existing.created_at,
    state_delta:  {},
    trace_id:     existing.trace_id,
    idempotent:   true,
  },
});

const post_event_function = async (data: post_event_function_params, transaction: Transaction): Promise<post_event_function_return | Error_Interface> => {
  const envelope = build_envelope(data);

  const existing = await find_existing_by_idempotency(envelope.scope.project_id, envelope.idempotency_key, transaction);
  if (existing) {
    if (!envelope_matches(existing, envelope)) return { code: 409, message: 'Idempotency key already used with a different event type' };
    return shape_idempotent_reply(existing);
  }

  const event_id    = uuidv4();
  const sequence_no = await claim_next_sequence_no(envelope.scope.project_id, transaction);
  const ctx: EventContext = { actor: data.user, trace_id: data.trace_id, sequence_no, event_id };

  const result = await dispatch_event(envelope, ctx, transaction);
  if ('code' in result && 'message' in result) return result as Error_Interface;

  const affected = (result as any).affected_entities ?? {};
  await persist_event({ envelope, ctx, affected }, transaction);

  return {
    code:    200,
    message: 'accepted',
    data: {
      id:           event_id,
      sequence_no,
      applied_at:   new Date().toISOString(),
      state_delta:  (result as any).state_delta ?? {},
      affected_entities: affected,
      trace_id:     data.trace_id,
    },
    headers: { 'X-Sequence-No': String(sequence_no) },
  };
};

export default post_event_function;
