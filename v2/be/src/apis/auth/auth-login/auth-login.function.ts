import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { kc_password_login } from '@setup/keycloak-rest';
import { verify_bearer_token } from '@setup/jwt-verify';
import { ensure_user_from_claims } from '@setup/user-upsert';
import { auth_login_function_params, auth_login_function_return } from './auth-login.interface';

const shape_user = (claims: any) => ({
  id:    claims.sub,
  email: claims.email,
  name:  claims.name ?? claims.preferred_username ?? claims.email,
});

const auth_login_function = async (data: auth_login_function_params, transaction: Transaction): Promise<auth_login_function_return | Error_Interface> => {
  const tokens = await kc_password_login(data.email, data.password);
  const claims = await verify_bearer_token(tokens.access_token);
  await ensure_user_from_claims(claims as any, transaction);

  return {
    code:    200,
    message: 'Login successful',
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

export default auth_login_function;
