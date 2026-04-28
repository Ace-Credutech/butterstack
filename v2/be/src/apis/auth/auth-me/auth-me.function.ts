import { Error_Interface } from '@config/interfaces/error.interface';
import { get_user_orgs, OrgWithRole } from '@setup/orgs';
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

const shape_org_entry = (entry: OrgWithRole) => ({
  id:      entry.org.id,
  slug:    entry.org.slug,
  name:    entry.org.name,
  type:    entry.org.type,
  my_role: entry.my_role,
});

const shape_user = (user: any, orgs: ReturnType<typeof shape_org_entry>[]) => ({
  id:    user.id,
  email: user.email,
  name:  user.name,
  role:  shape_role(user.Role),
  orgs,
});

const auth_me_function = async (data: auth_me_function_params): Promise<auth_me_function_return | Error_Interface> => {
  try {
    const user = data.user;
    if (!user) return { code: 200, message: 'unauthenticated', data: { authenticated: false } };
    const memberships = await get_user_orgs(user.id);
    const orgs        = memberships.map(shape_org_entry);
    return {
      code:    200,
      message: 'current user',
      data:    { authenticated: true, user: shape_user(user, orgs) },
    };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to get current user') };
  }
};

export default auth_me_function;
