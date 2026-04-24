import { Op } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { Project } from '@models/project.model';
import { list_projects_function_params, list_projects_function_return } from './list-projects.interface';

const decode_cursor = (cursor?: string): Date | undefined => {
  if (!cursor) return undefined;
  try { return new Date(Buffer.from(cursor, 'base64url').toString('utf8')); }
  catch { return undefined; }
};

const encode_cursor = (d: Date): string => Buffer.from(d.toISOString(), 'utf8').toString('base64url');

const list_projects_function = async (data: list_projects_function_params): Promise<list_projects_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const limit        = data.limit ?? 50;
  const cursor_date  = decode_cursor(data.cursor);
  const where        = cursor_date ? { owner_id: data.user.id, created_at: { [Op.lt]: cursor_date } } : { owner_id: data.user.id };

  const rows         = await Project.findAll({ where, order: [['created_at', 'DESC']], limit: limit + 1 });
  const has_more     = rows.length > limit;
  const page         = has_more ? rows.slice(0, limit) : rows;
  const last         = page[page.length - 1];
  const next_cursor  = has_more && last ? encode_cursor(last.created_at) : null;

  return {
    code:    200,
    message: 'projects',
    data: {
      items:       page.map(p => ({ id: p.id, name: p.name, slug: p.slug, brief: p.brief, created_at: p.created_at })),
      next_cursor,
    },
  };
};

export default list_projects_function;
