import { Error_Interface } from '@config/interfaces/error.interface';
import { env } from '@src/env';
import { kc_logout } from '@setup/keycloak-rest';
import { auth_logout_function_params, auth_logout_function_return } from './auth-logout.interface';

const auth_logout_function = async (data: auth_logout_function_params & { refresh_token?: string }): Promise<auth_logout_function_return | Error_Interface> => {
  if (data.refresh_token) await kc_logout(data.refresh_token).catch(() => {});
  return {
    code:    200,
    message: 'Logged out',
    data:    { authenticated: false },
    cookies: [{ name: env.SESSION_COOKIE_NAME, value: '', options: { clear: true, path: '/' } }],
  };
};

export default auth_logout_function;
