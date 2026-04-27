import { Error_Interface } from '@config/interfaces/error.interface';
import { get_user_orgs } from '@setup/orgs';
import { list_orgs_function_params, list_orgs_function_return } from './list-orgs.interface';

const shape_org = (org: any, user_id: string) => ({
  id:          org.id,
  slug:        org.slug,
  name:        org.name,
  type:        org.type,
  is_personal: org.slug === `personal-${user_id}`,
  created_at:  org.created_at,
});

const list_orgs_function = async (data: list_orgs_function_params): Promise<list_orgs_function_return | Error_Interface> => {
  try {
    if (!data.user) return { code: 401, message: 'Authentication required' };
    const orgs = await get_user_orgs(data.user.id);
    return {
      code:    200,
      message: 'organisations',
      data:    { items: orgs.map(o => shape_org(o, data.user.id)) },
    };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to list organisations') };
  }
};

export default list_orgs_function;
