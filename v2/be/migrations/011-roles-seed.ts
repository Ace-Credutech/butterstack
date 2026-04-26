import { QueryInterface, QueryTypes } from 'sequelize';
import { randomUUID } from 'crypto';

const role_definitions = [
  {
    slug:        'super_admin',
    name:        'Super Admin',
    description: 'Full system access. Can manage users, roles, and all data.',
    permissions: { '*': true },
  },
  {
    slug:        'product_manager',
    name:        'Product Manager',
    description: 'Owns the product. Can manage projects, modules, versions, conversations. Can promote other product managers.',
    permissions: {
      projects:      { create: true, read: true, update: true, delete: true },
      modules:       { create: true, read: true, update: true, delete: true },
      versions:      { create: true, read: true, update: true, delete: true, approve: true },
      conversations: { create: true, read: true, update: true, delete: true },
      admin:         { users: { read: true }, roles: { read: true } },
      role:          { promote_pm: true },
    },
  },
  {
    slug:        'member',
    name:        'Member',
    description: 'Read-only access to projects they belong to. Can participate in conversations.',
    permissions: {
      projects:      { read: true },
      modules:       { read: true },
      versions:      { read: true },
      conversations: { create: true, read: true, update_own: true },
    },
  },
];

const upsert_role = async (qi: QueryInterface, def: typeof role_definitions[number]) => {
  const existing = await qi.sequelize.query(
    'SELECT id FROM roles WHERE slug = :slug LIMIT 1',
    { replacements: { slug: def.slug }, type: QueryTypes.SELECT },
  );
  if ((existing as any[]).length > 0) {
    await qi.sequelize.query(
      `UPDATE roles SET name = :name, description = :description, permissions_json = :permissions::jsonb, is_system = true, updated_at = NOW() WHERE slug = :slug`,
      { replacements: { slug: def.slug, name: def.name, description: def.description, permissions: JSON.stringify(def.permissions) } },
    );
    return;
  }
  await qi.sequelize.query(
    `INSERT INTO roles (id, slug, name, description, permissions_json, is_system, created_at, updated_at)
     VALUES (:id, :slug, :name, :description, :permissions::jsonb, true, NOW(), NOW())`,
    { replacements: { id: randomUUID(), slug: def.slug, name: def.name, description: def.description, permissions: JSON.stringify(def.permissions) } },
  );
};

export const up = async (qi: QueryInterface) => {
  for (const def of role_definitions) await upsert_role(qi, def);
};

export const down = async (qi: QueryInterface) => {
  await qi.bulkDelete('roles', { is_system: true } as any);
};
