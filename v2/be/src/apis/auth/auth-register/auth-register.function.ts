import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { kc_create_user, kc_password_login } from '@setup/keycloak-rest';
import { verify_bearer_token } from '@setup/jwt-verify';
import { ensure_user_from_claims } from '@setup/user-upsert';
import { auth_register_function_params, auth_register_function_return } from './auth-register.interface';

const shape_user = (claims: any) => ({
  id:    claims.sub,
  email: claims.email,
  name:  claims.name ?? claims.preferred_username ?? claims.email,
});

const auth_register_function = async (data: auth_register_function_params, transaction: Transaction): Promise<auth_register_function_return | Error_Interface> => {
  await kc_create_user({ email: data.email, password: data.password, first_name: data.first_name, last_name: data.last_name });
  const tokens = await kc_password_login(data.email, data.password);
  const claims = await verify_bearer_token(tokens.access_token);
  await ensure_user_from_claims(claims as any, transaction);

  return {
    code:    201,
    message: 'Registered and logged in',
    data: {
      access_token:       tokens.access_token,
      refresh_token:      tokens.refresh_token,
      expires_in:         tokens.expires_in,
      refresh_expires_in: tokens.refresh_expires_in,
      token_type:         tokens.token_type,
      user:               shape_user(claims),
    },
  };
};

export default auth_register_function;
