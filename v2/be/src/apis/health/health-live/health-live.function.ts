import { Error_Interface } from '@config/interfaces/error.interface';
import { health_live_function_params, health_live_function_return } from './health-live.interface';

const health_live_function = async (_data: health_live_function_params): Promise<health_live_function_return | Error_Interface> => {
  return { code: 200, message: 'live', data: { status: 'live', at: new Date().toISOString() } };
};

export default health_live_function;
