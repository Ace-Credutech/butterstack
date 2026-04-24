import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('activity_logs', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id:     { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    action:      { type: DataTypes.STRING, allowNull: false },
    entity:      { type: DataTypes.STRING, allowNull: false },
    entity_id:   { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    trace_id:    { type: DataTypes.UUID, allowNull: false },
    created_at:  { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addIndex('activity_logs', ['user_id']);
  await qi.addIndex('activity_logs', ['entity', 'entity_id']);
};

export const down = async (qi: QueryInterface) => qi.dropTable('activity_logs');
