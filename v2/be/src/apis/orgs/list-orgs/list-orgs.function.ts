import { Error_Interface } from '@config/interfaces/error.interface';
import { get_user_orgs, OrgWithRole } from '@setup/orgs';
import { list_orgs_function_params, list_orgs_function_return } from './list-orgs.interface';

const shape_entry = (entry: OrgWithRole) => ({
  id:      entry.org.id,
  slug:    entry.org.slug,
  name:    entry.org.name,
  type:    entry.org.type,
  my_role: entry.my_role,
});

const list_orgs_function = async (data: list_orgs_function_params): Promise<list_orgs_function_return | Error_Interface> => {
  try {
    if (!data.user) return { code: 401, message: 'Authentication required' };
    const memberships = await get_user_orgs(data.user.id);
    return {
      code:    200,
      message: 'organisations',
      data:    { items: memberships.map(shape_entry) },
    };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to list organisations') };
  }
};

export default list_orgs_function;
