import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { EventHandlerDetails, EventEnvelope, EventContext, EventResult } from './event.types';

const registry = new Map<string, EventHandlerDetails>();

export const register_event_handler = (details: EventHandlerDetails) => {
  if (registry.has(details.type)) throw new Error(`Duplicate event handler registered for type: ${details.type}`);
  registry.set(details.type, details);
};

export const register_event_handlers = (list: EventHandlerDetails[]) => {
  for (const d of list) register_event_handler(d);
};

export const get_event_handler    = (type: string): EventHandlerDetails | undefined => registry.get(type);
export const list_registered_types = (): string[] => Array.from(registry.keys());

const validate_payload = (details: EventHandlerDetails, envelope: EventEnvelope): Record<string, unknown> | Error_Interface => {
  const parsed = details.payload_schema.safeParse(envelope.payload);
  if (!parsed.success) return { code: 422, message: `Invalid payload for ${envelope.type}`, details: parsed.error.flatten() };
  return parsed.data;
};

const check_authority = (details: EventHandlerDetails, ctx: EventContext): Error_Interface | null => {
  if (details.required_authority_rank === undefined) return null;
  const rank = ctx.actor?.authority_rank ?? Number.POSITIVE_INFINITY;
  if (rank > details.required_authority_rank) return { code: 403, message: `Event ${details.type} requires authority_rank ≤ ${details.required_authority_rank}` };
  return null;
};

export const dispatch_event = async (envelope: EventEnvelope, ctx: EventContext, transaction: Transaction): Promise<EventResult | Error_Interface> => {
  const details = get_event_handler(envelope.type);
  if (!details) return { code: 422, message: `Unknown event type: ${envelope.type}` };

  const payload_or_err = validate_payload(details, envelope);
  if ('code' in payload_or_err && 'message' in payload_or_err) return payload_or_err as Error_Interface;

  const authority_err = check_authority(details, ctx);
  if (authority_err) return authority_err;

  return details.handler(payload_or_err, envelope.scope, ctx, transaction);
};
