import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { User } from './user.model';

export class PasswordResetToken extends Model<InferAttributes<PasswordResetToken>, InferCreationAttributes<PasswordResetToken>> {
  declare id:         CreationOptional<string>;
  declare user_id:    ForeignKey<User['id']>;
  declare token_hash: string;
  declare expires_at: Date;
  declare used_at:    CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

PasswordResetToken.init({
  id:         { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    { type: DataTypes.UUID,    allowNull: false, references: { model: 'users', key: 'id' } },
  token_hash: { type: DataTypes.STRING,  allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE,    allowNull: false },
  used_at:    { type: DataTypes.DATE,    allowNull: true },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, { sequelize, tableName: 'password_reset_tokens', paranoid: false });

PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
