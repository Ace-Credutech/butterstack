import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('links', {
    id:          { type: DataTypes.UUID,         defaultValue: DataTypes.UUIDV4, primaryKey: true },
    scope_type:  { type: DataTypes.STRING(20),   allowNull: false },
    scope_id:    { type: DataTypes.UUID,         allowNull: false },
    url:         { type: DataTypes.TEXT,         allowNull: false },
    title:       { type: DataTypes.STRING(255),  allowNull: true },
    description: { type: DataTypes.TEXT,         allowNull: true },
    added_by:    { type: DataTypes.UUID,         allowNull: false, references: { model: 'users', key: 'id' } },
    created_at:  { type: DataTypes.DATE,         allowNull: false },
    updated_at:  { type: DataTypes.DATE,         allowNull: false },
    deleted_at:  { type: DataTypes.DATE,         allowNull: true },
  });

  await qi.addIndex('links', ['scope_type', 'scope_id'], { name: 'links_scope_idx' });
  await qi.addIndex('links', ['added_by'],               { name: 'links_added_by_idx' });
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('links');
};
