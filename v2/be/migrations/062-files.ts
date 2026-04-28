import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('files', {
    id:           { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
    uploaded_by:  { type: DataTypes.UUID,    allowNull: false, references: { model: 'users', key: 'id' } },
    scope_type:   { type: DataTypes.STRING(20),  allowNull: false },
    scope_id:     { type: DataTypes.UUID,    allowNull: true },
    bucket:       { type: DataTypes.STRING(100), allowNull: false },
    storage_key:  { type: DataTypes.STRING(500), allowNull: false },
    filename:     { type: DataTypes.STRING(255), allowNull: false },
    mime_type:    { type: DataTypes.STRING(100), allowNull: false },
    size_bytes:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_public:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at:   { type: DataTypes.DATE,    allowNull: false },
    updated_at:   { type: DataTypes.DATE,    allowNull: false },
    deleted_at:   { type: DataTypes.DATE,    allowNull: true },
  });

  await qi.addIndex('files', ['uploaded_by'],            { name: 'files_uploaded_by_idx' });
  await qi.addIndex('files', ['scope_type', 'scope_id'], { name: 'files_scope_idx' });
  await qi.addIndex('files', ['storage_key'],            { name: 'files_storage_key_idx' });
  await qi.addConstraint('files', {
    fields: ['bucket', 'storage_key'],
    type:   'unique',
    name:   'files_bucket_storage_key_unique',
  });
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('files');
};
