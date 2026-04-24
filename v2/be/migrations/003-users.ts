import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('users', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email:        { type: DataTypes.STRING, allowNull: false, unique: true },
    name:         { type: DataTypes.STRING, allowNull: false },
    keycloak_sub: { type: DataTypes.STRING, allowNull: false, unique: true },
    role_id:      { type: DataTypes.UUID,   allowNull: true, references: { model: 'roles', key: 'id' } },
    is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at:   { type: DataTypes.DATE,   allowNull: false },
    updated_at:   { type: DataTypes.DATE,   allowNull: false },
    deleted_at:   { type: DataTypes.DATE,   allowNull: true },
  });
  await qi.addIndex('users', ['keycloak_sub']);
};

export const down = async (qi: QueryInterface) => qi.dropTable('users');
