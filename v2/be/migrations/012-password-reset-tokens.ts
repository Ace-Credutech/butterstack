import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('password_reset_tokens', {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id:    { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    token_hash: { type: DataTypes.STRING, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at:    { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addIndex('password_reset_tokens', ['token_hash'], { unique: true, name: 'pwd_reset_token_hash_unique' });
  await qi.addIndex('password_reset_tokens', ['user_id']);
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('password_reset_tokens');
};
