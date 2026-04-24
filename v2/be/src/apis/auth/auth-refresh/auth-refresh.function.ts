import { Error_Interface } from '@config/interfaces/error.interface';
import { kc_refresh_token } from '@setup/keycloak-rest';
import { auth_refresh_function_params, auth_refresh_function_return } from './auth-refresh.interface';

const auth_refresh_function = async (data: auth_refresh_function_params): Promise<auth_refresh_function_return | Error_Interface> => {
  const tokens = await kc_refresh_token(data.refresh_token);
  return {
    code:    200,
    message: 'Token refreshed',
    data: {
      access_token:       tokens.access_token,
      refresh_token:      tokens.refresh_token,
      expires_in:         tokens.expires_in,
      refresh_expires_in: tokens.refresh_expires_in,
      token_type:         tokens.token_type,
    },
  };
};

export default auth_refresh_function;
