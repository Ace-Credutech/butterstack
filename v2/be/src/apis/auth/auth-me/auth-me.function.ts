import { Error_Interface } from '@config/interfaces/error.interface';
import { auth_me_function_params, auth_me_function_return } from './auth-me.interface';

const shape_role = (role: any) => {
  if (!role) return null;
  return {
    id:          role.id,
    slug:        role.slug,
    name:        role.name,
    permissions: role.permissions_json ?? {},
  };
};

const shape_user = (user: any) => ({
  id:    user.id,
  email: user.email,
  name:  user.name,
  role:  shape_role(user.Role),
});

const auth_me_function = async (data: auth_me_function_params): Promise<auth_me_function_return | Error_Interface> => {
  const user = data.user;
  if (!user) return { code: 200, message: 'unauthenticated', data: { authenticated: false } };
  return {
    code:    200,
    message: 'current user',
    data: {
      authenticated: true,
      user:          shape_user(user),
    },
  };
};

export default auth_me_function;
