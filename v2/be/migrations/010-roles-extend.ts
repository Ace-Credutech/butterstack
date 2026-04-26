import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.addColumn('roles', 'slug',      { type: DataTypes.STRING, allowNull: true });
  await qi.addColumn('roles', 'is_system', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await qi.sequelize.query("UPDATE roles SET slug = lower(replace(name, ' ', '_')) WHERE slug IS NULL");
  await qi.changeColumn('roles', 'slug', { type: DataTypes.STRING, allowNull: false });
  await qi.addIndex('roles', ['slug'], { unique: true, name: 'roles_slug_unique' });
};

export const down = async (qi: QueryInterface) => {
  await qi.removeIndex('roles', 'roles_slug_unique');
  await qi.removeColumn('roles', 'slug');
  await qi.removeColumn('roles', 'is_system');
};
