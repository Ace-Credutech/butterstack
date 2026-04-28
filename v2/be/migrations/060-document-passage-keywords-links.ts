import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.sequelize.query(`
    ALTER TABLE document_passages
    ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}';
  `);
  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS document_passages_keywords_idx
    ON document_passages USING gin(keywords);
  `);

  await qi.createTable('document_passage_links', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    from_passage_id:  { type: DataTypes.UUID, allowNull: false, references: { model: 'document_passages', key: 'id' }, onDelete: 'CASCADE' },
    to_passage_id:    { type: DataTypes.UUID, allowNull: false, references: { model: 'document_passages', key: 'id' }, onDelete: 'CASCADE' },
    link_type:        { type: DataTypes.STRING(50), allowNull: false },
    created_at:       { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addConstraint('document_passage_links', {
    fields: ['from_passage_id', 'to_passage_id'],
    type:   'unique',
    name:   'document_passage_links_pair_unique',
  });
  await qi.addIndex('document_passage_links', ['from_passage_id'], { name: 'document_passage_links_from_idx' });
  await qi.addIndex('document_passage_links', ['to_passage_id'],   { name: 'document_passage_links_to_idx' });
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('document_passage_links');
  await qi.sequelize.query(`DROP INDEX IF EXISTS document_passages_keywords_idx;`);
  await qi.sequelize.query(`ALTER TABLE document_passages DROP COLUMN IF EXISTS keywords;`);
};
