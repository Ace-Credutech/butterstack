import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '@setup/sequelize';

export class ApiCallLog extends Model<InferAttributes<ApiCallLog>, InferCreationAttributes<ApiCallLog>> {
  declare id:            CreationOptional<string>;
  declare module:        string;
  declare api_name:      string;
  declare method:        string;
  declare path:          string;
  declare user_id:       string | null;
  declare status_code:   number;
  declare duration_ms:   number;
  declare request_query: Record<string, unknown> | null;
  declare request_body:  Record<string, unknown> | null;
  declare error_message: string | null;
  declare trace_id:      string;
  declare created_at:    CreationOptional<Date>;
}

ApiCallLog.init({
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  module:        { type: DataTypes.STRING, allowNull: false },
  api_name:      { type: DataTypes.STRING, allowNull: false },
  method:        { type: DataTypes.STRING, allowNull: false },
  path:          { type: DataTypes.STRING, allowNull: false },
  user_id:       { type: DataTypes.UUID, allowNull: true },
  status_code:   { type: DataTypes.INTEGER, allowNull: false },
  duration_ms:   { type: DataTypes.INTEGER, allowNull: false },
  request_query: { type: DataTypes.JSONB, allowNull: true },
  request_body:  { type: DataTypes.JSONB, allowNull: true },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  trace_id:      { type: DataTypes.UUID, allowNull: false },
  created_at:    DataTypes.DATE,
}, {
  sequelize,
  tableName:  'api_call_logs',
  paranoid:   false,
  timestamps: true,
  updatedAt:  false,
});
