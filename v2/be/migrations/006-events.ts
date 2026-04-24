import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('project_sequences', {
    project_id: { type: DataTypes.UUID, primaryKey: true, references: { model: 'projects', key: 'id' } },
    last_seq:   { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.createTable('events', {
    id:                       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id:               { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
    sequence_no:              { type: DataTypes.BIGINT, allowNull: false },
    actor_id:                 { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    authority_rank:           { type: DataTypes.INTEGER, allowNull: true },
    type:                     { type: DataTypes.STRING, allowNull: false },
    payload_json:             { type: DataTypes.JSONB, allowNull: false },
    scope_json:               { type: DataTypes.JSONB, allowNull: false },
    affected_entities_json:   { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    source:                   { type: DataTypes.ENUM('user', 'ai', 'system'), allowNull: false },
    idempotency_key:          { type: DataTypes.UUID, allowNull: false },
    expected_version:         { type: DataTypes.INTEGER, allowNull: true },
    override_target_event_id: { type: DataTypes.UUID, allowNull: true },
    event_version:            { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    trace_id:                 { type: DataTypes.UUID, allowNull: false },
    created_at:               { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('events', ['project_id', 'sequence_no'],     { unique: true, name: 'events_project_seq_unique' });
  await qi.addIndex('events', ['project_id', 'idempotency_key'], { unique: true, name: 'events_idempotency_unique' });
  await qi.addIndex('events', ['project_id', 'type'],            { name: 'events_project_type_idx' });
  await qi.addIndex('events', ['trace_id'],                      { name: 'events_trace_idx' });
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('events');
  await qi.dropTable('project_sequences');
  await qi.sequelize.query(`DROP TYPE IF EXISTS "enum_events_source";`);
};
