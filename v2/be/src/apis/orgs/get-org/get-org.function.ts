import { Error_Interface } from '@config/interfaces/error.interface';
import { Organisation } from '@models/organisation.model';
import { OrganisationMember } from '@models/organisation-member.model';
import { get_org_function_params, get_org_function_return } from './get-org.interface';

const is_member = async (org_id: string, user_id: string): Promise<boolean> => {
  try {
    const membership = await OrganisationMember.findOne({ where: { org_id, user_id } });
    return !!membership;
  } catch { return false; }
};

const shape_org = (org: Organisation, user_id: string) => ({
  id:          org.id,
  slug:        org.slug,
  name:        org.name,
  type:        org.type,
  is_personal: org.slug === `personal-${user_id}`,
  created_at:  org.created_at,
});

const get_org_function = async (data: get_org_function_params): Promise<get_org_function_return | Error_Interface> => {
  try {
    if (!data.user) return { code: 401, message: 'Authentication required' };
    const org = await Organisation.findByPk(data.org_id);
    if (!org)                                            return { code: 404, message: 'Organisation not found' };
    const member = await is_member(data.org_id, data.user.id);
    if (!member)                                         return { code: 403, message: 'Access denied' };
    return { code: 200, message: 'organisation', data: shape_org(org, data.user.id) };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to get organisation') };
  }
};

export default get_org_function;
