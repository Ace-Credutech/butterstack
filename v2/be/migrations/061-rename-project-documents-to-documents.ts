import { QueryInterface } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.renameTable('project_documents', 'documents');
};

export const down = async (qi: QueryInterface) => {
  await qi.renameTable('documents', 'project_documents');
};
