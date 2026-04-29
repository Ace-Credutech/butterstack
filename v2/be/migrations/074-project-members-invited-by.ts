import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.addColumn('project_members', 'invited_by', {
    type:       DataTypes.UUID,
    allowNull:  true,
    references: { model: 'users', key: 'id' },
  });
};

export const down = async (qi: QueryInterface) => qi.removeColumn('project_members', 'invited_by');
