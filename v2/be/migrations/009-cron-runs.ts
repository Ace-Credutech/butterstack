import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('cron_runs', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    cron_name:     { type: DataTypes.STRING, allowNull: false },
    fired_at:      { type: DataTypes.DATE, allowNull: false },
    started_at:    { type: DataTypes.DATE, allowNull: true },
    finished_at:   { type: DataTypes.DATE, allowNull: true },
    outcome:       { type: DataTypes.ENUM('success', 'error', 'skipped-locked'), allowNull: false },
    duration_ms:   { type: DataTypes.INTEGER, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    trace_id:      { type: DataTypes.UUID, allowNull: false },
    created_at:    { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addIndex('cron_runs', ['cron_name', 'fired_at']);
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('cron_runs');
  await qi.sequelize.query(`DROP TYPE IF EXISTS "enum_cron_runs_outcome";`);
};
