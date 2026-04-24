import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.createTable('project_members', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id:       { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
    user_id:          { type: DataTypes.UUID, allowNull: true,  references: { model: 'users', key: 'id' } },
    email:            { type: DataTypes.STRING, allowNull: false },
    name:             { type: DataTypes.STRING, allowNull: false },
    designation:      { type: DataTypes.STRING, allowNull: false },
    stakeholder_role: { type: DataTypes.ENUM('decider', 'reviewer', 'contributor', 'observer'), allowNull: false },
    authority_rank:   { type: DataTypes.INTEGER, allowNull: false },
    created_at:       { type: DataTypes.DATE, allowNull: false },
    updated_at:       { type: DataTypes.DATE, allowNull: false },
    deleted_at:       { type: DataTypes.DATE, allowNull: true },
  });
  await qi.addIndex('project_members', ['project_id']);
  await qi.addIndex('project_members', ['project_id', 'email']);
};

export const down = async (qi: QueryInterface) => {
  await qi.dropTable('project_members');
  await qi.sequelize.query(`DROP TYPE IF EXISTS "enum_project_members_stakeholder_role";`);
};
