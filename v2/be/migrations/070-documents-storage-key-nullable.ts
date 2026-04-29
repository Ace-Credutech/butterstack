import { QueryInterface, DataTypes } from 'sequelize';

// Allow paste-as-text documents (kind='paste') which carry their content in parsed_text
// and have no MinIO object — D-1 from boss's plan.

export const up = async (qi: QueryInterface) => {
  await qi.changeColumn('documents', 'storage_key', {
    type:      DataTypes.STRING(255),
    allowNull: true,
  });
};

export const down = async (qi: QueryInterface) => {
  // NOTE: down only succeeds if there are no rows with NULL storage_key. Backfill with a sentinel
  // before rolling back if you've already created paste documents.
  await qi.changeColumn('documents', 'storage_key', {
    type:      DataTypes.STRING(255),
    allowNull: false,
  });
};
