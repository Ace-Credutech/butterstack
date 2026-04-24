import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('roles', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name:             { type: DataTypes.STRING, allowNull: false, unique: true },
    description:      { type: DataTypes.TEXT,   allowNull: true },
    permissions_json: { type: DataTypes.JSONB,  allowNull: false, defaultValue: {} },
    created_at:       { type: DataTypes.DATE,   allowNull: false },
    updated_at:       { type: DataTypes.DATE,   allowNull: false },
    deleted_at:       { type: DataTypes.DATE,   allowNull: true },
  });
};

export const down = async (qi: QueryInterface) => qi.dropTable('roles');
