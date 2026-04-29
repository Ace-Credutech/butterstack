import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('project_roles', {
    id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    project_id:  { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
    name:        { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at:  { type: DataTypes.DATE, allowNull: false },
    updated_at:  { type: DataTypes.DATE, allowNull: false },
    deleted_at:  { type: DataTypes.DATE, allowNull: true },
    created_by:  { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    updated_by:  { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  });

  await qi.sequelize.query(`CREATE INDEX project_roles_project_id_idx ON project_roles (project_id) WHERE deleted_at IS NULL;`);
  await qi.sequelize.query(`CREATE UNIQUE INDEX project_roles_project_name_uniq ON project_roles (project_id, lower(name)) WHERE deleted_at IS NULL;`);
};

export const down = async (qi: QueryInterface) => qi.dropTable('project_roles');
