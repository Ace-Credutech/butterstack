import { Error_Interface } from '@config/interfaces/error.interface';
import { Event } from '@models/event.model';
import { get_event_function_params, get_event_function_return } from './get-event.interface';

const get_event_function = async (data: get_event_function_params): Promise<get_event_function_return | Error_Interface> => {
  const event = await Event.findByPk(data.id);
  if (!event) return { code: 404, message: `Event ${data.id} not found` };
  return { code: 200, message: 'event', data: event.toJSON() };
};

export default get_event_function;
