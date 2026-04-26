import { sequelize } from '@setup/sequelize';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import '@models/index';

const usage = () => {
  console.error('Usage: bun src/scripts/promote-user.ts <email> <role_slug>');
  console.error('Example: bun src/scripts/promote-user.ts akash@thecontrast.in super_admin');
  process.exit(2);
};

const find_user_by_email = async (email: string) => User.findOne({ where: { email } as any });
const find_role_by_slug  = async (slug:  string) => Role.findOne({ where: { slug } as any });

const main = async () => {
  const email     = process.argv[2] ?? '';
  const role_slug = process.argv[3] ?? '';
  if (!email || !role_slug) { usage(); return; }

  const user = await find_user_by_email(email);
  if (!user) { console.error(`No user found with email ${email}`); process.exit(1); }

  const role = await find_role_by_slug(role_slug);
  if (!role) { console.error(`No role found with slug ${role_slug}`); process.exit(1); }

  await user.update({ role_id: role.id } as any);
  console.log(`Promoted ${email} -> ${role_slug}`);
  await sequelize.close();
};

await main();
