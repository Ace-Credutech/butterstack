import { Error_Interface } from '@config/interfaces/error.interface';
import { find_personal_org } from '@setup/orgs';
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

const shape_org = (org: any) => ({
  id:   org.id,
  slug: org.slug,
  name: org.name,
  type: org.type,
});

const shape_user = (user: any, org: any) => ({
  id:   user.id,
  email: user.email,
  name:  user.name,
  role:  shape_role(user.Role),
  org:   org ? shape_org(org) : null,
});

const auth_me_function = async (data: auth_me_function_params): Promise<auth_me_function_return | Error_Interface> => {
  try {
    const user = data.user;
    if (!user) return { code: 200, message: 'unauthenticated', data: { authenticated: false } };
    const personal_org = await find_personal_org(user.id);
    return {
      code:    200,
      message: 'current user',
      data:    { authenticated: true, user: shape_user(user, personal_org) },
    };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to get current user') };
  }
};

export default auth_me_function;
