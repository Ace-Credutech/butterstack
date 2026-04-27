import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('document_passages', {
    id:          { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
    document_id: { type: DataTypes.UUID,    allowNull: false, references: { model: 'project_documents', key: 'id' }, onDelete: 'CASCADE' },
    idx:         { type: DataTypes.INTEGER, allowNull: false },
    type:        { type: DataTypes.STRING(50), allowNull: false },
    heading:     { type: DataTypes.TEXT,    allowNull: true },
    text:        { type: DataTypes.TEXT,    allowNull: false },
    created_at:  { type: DataTypes.DATE,    allowNull: false },
    updated_at:  { type: DataTypes.DATE,    allowNull: false },
  });
  await qi.addConstraint('document_passages', {
    fields: ['document_id', 'idx'],
    type:   'unique',
    name:   'document_passages_document_id_idx_unique',
  });
  await qi.addIndex('document_passages', ['document_id'], { name: 'document_passages_document_id_idx' });

  await qi.createTable('document_entities', {
    id:          { type: DataTypes.UUID,       defaultValue: DataTypes.UUIDV4, primaryKey: true },
    document_id: { type: DataTypes.UUID,       allowNull: false, references: { model: 'project_documents', key: 'id' }, onDelete: 'CASCADE' },
    name:        { type: DataTypes.STRING(255), allowNull: false },
    type:        { type: DataTypes.STRING(50),  allowNull: false },
    created_at:  { type: DataTypes.DATE,        allowNull: false },
    updated_at:  { type: DataTypes.DATE,        allowNull: false },
  });
  await qi.addIndex('document_entities', ['document_id'], { name: 'document_entities_document_id_idx' });

  await qi.removeColumn('project_documents', 'parsed_content');
};

export const down = async (qi: QueryInterface) => {
  await qi.addColumn('project_documents', 'parsed_content', { type: DataTypes.JSONB, allowNull: true });
  await qi.dropTable('document_entities');
  await qi.dropTable('document_passages');
};
