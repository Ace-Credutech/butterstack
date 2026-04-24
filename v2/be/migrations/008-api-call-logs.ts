import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('api_call_logs', {
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
    created_at:    { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addIndex('api_call_logs', ['trace_id']);
  await qi.addIndex('api_call_logs', ['user_id']);
  await qi.addIndex('api_call_logs', ['status_code']);
  await qi.addIndex('api_call_logs', ['module', 'api_name']);
};

export const down = async (qi: QueryInterface) => qi.dropTable('api_call_logs');
