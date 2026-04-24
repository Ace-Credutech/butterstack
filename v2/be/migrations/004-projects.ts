import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('projects', {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    owner_id:   { type: DataTypes.UUID,   allowNull: false, references: { model: 'users', key: 'id' } },
    name:       { type: DataTypes.STRING, allowNull: false },
    slug:       { type: DataTypes.STRING, allowNull: false, unique: true },
    brief:      { type: DataTypes.TEXT,   allowNull: true },
    created_at: { type: DataTypes.DATE,   allowNull: false },
    updated_at: { type: DataTypes.DATE,   allowNull: false },
    deleted_at: { type: DataTypes.DATE,   allowNull: true },
  });
  await qi.addIndex('projects', ['owner_id']);
};

export const down = async (qi: QueryInterface) => qi.dropTable('projects');
