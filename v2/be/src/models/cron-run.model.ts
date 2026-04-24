import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '@setup/sequelize';

export type CronOutcome = 'success' | 'error' | 'skipped-locked';

export class CronRun extends Model<InferAttributes<CronRun>, InferCreationAttributes<CronRun>> {
  declare id:             CreationOptional<string>;
  declare cron_name:      string;
  declare fired_at:       Date;
  declare started_at:     Date | null;
  declare finished_at:    Date | null;
  declare outcome:        CronOutcome;
  declare duration_ms:    number | null;
  declare error_message:  string | null;
  declare trace_id:       string;
  declare created_at:     CreationOptional<Date>;
}

CronRun.init({
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  cron_name:     { type: DataTypes.STRING, allowNull: false },
  fired_at:      { type: DataTypes.DATE, allowNull: false },
  started_at:    { type: DataTypes.DATE, allowNull: true },
  finished_at:   { type: DataTypes.DATE, allowNull: true },
  outcome:       { type: DataTypes.ENUM('success', 'error', 'skipped-locked'), allowNull: false },
  duration_ms:   { type: DataTypes.INTEGER, allowNull: true },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  trace_id:      { type: DataTypes.UUID, allowNull: false },
  created_at:    DataTypes.DATE,
}, { sequelize, tableName: 'cron_runs', paranoid: false, timestamps: true, updatedAt: false });
