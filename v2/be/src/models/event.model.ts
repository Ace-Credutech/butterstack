import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Organisation } from './organisation.model';
import { Project } from './project.model';
import { User } from './user.model';

export type EventSource = 'user' | 'ai' | 'system';

export class Event extends Model<InferAttributes<Event>, InferCreationAttributes<Event>> {
  declare id:                       CreationOptional<string>;
  declare project_id:               ForeignKey<Project['id']>;
  declare org_id:                   ForeignKey<Organisation['id']>;
  declare sequence_no:              number;
  declare actor_id:                 ForeignKey<User['id']> | null;
  declare authority_rank:           number | null;
  declare type:                     string;
  declare payload_json:             Record<string, unknown>;
  declare scope_json:               Record<string, unknown>;
  declare affected_entities_json:   CreationOptional<Record<string, unknown>>;
  declare source:                   EventSource;
  declare idempotency_key:          string;
  declare expected_version:         number | null;
  declare override_target_event_id: string | null;
  declare event_version:            CreationOptional<number>;
  declare trace_id:                 string;
  declare created_at:               CreationOptional<Date>;
}

Event.init({
  id:                       { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:               { type: DataTypes.UUID,    allowNull: false, references: { model: 'projects',      key: 'id' } },
  org_id:                   { type: DataTypes.UUID,    allowNull: false, references: { model: 'organisations', key: 'id' } },
  sequence_no:              { type: DataTypes.BIGINT,  allowNull: false },
  actor_id:                 { type: DataTypes.UUID,    allowNull: true,  references: { model: 'users',         key: 'id' } },
  authority_rank:           { type: DataTypes.INTEGER, allowNull: true },
  type:                     { type: DataTypes.STRING,  allowNull: false },
  payload_json:             { type: DataTypes.JSONB,   allowNull: false },
  scope_json:               { type: DataTypes.JSONB,   allowNull: false },
  affected_entities_json:   { type: DataTypes.JSONB,   allowNull: false, defaultValue: {} },
  source:                   { type: DataTypes.ENUM('user', 'ai', 'system'), allowNull: false },
  idempotency_key:          { type: DataTypes.UUID,    allowNull: false },
  expected_version:         { type: DataTypes.INTEGER, allowNull: true },
  override_target_event_id: { type: DataTypes.UUID,    allowNull: true },
  event_version:            { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  trace_id:                 { type: DataTypes.UUID,    allowNull: false },
  created_at:               DataTypes.DATE,
}, {
  sequelize,
  tableName:  'events',
  paranoid:   false,
  timestamps: true,
  updatedAt:  false,
  indexes: [
    { fields: ['project_id', 'sequence_no'],    unique: true },
    { fields: ['project_id', 'idempotency_key'], unique: true },
    { fields: ['project_id', 'type'] },
    { fields: ['trace_id'] },
  ],
});

Event.belongsTo(Project,      { foreignKey: 'project_id', as: 'project' });
Event.belongsTo(Organisation, { foreignKey: 'org_id',     as: 'org' });
Event.belongsTo(User,         { foreignKey: 'actor_id',   as: 'actor' });
Project.hasMany(Event,        { foreignKey: 'project_id', as: 'events' });
