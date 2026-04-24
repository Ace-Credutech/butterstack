import { migrator } from './migrator';
import { close_all_dbs } from './sequelize';

const run = async () => {
  const cmd = process.argv[2] ?? 'up';
  if (cmd === 'up')     await migrator.up();
  else if (cmd === 'down')   await migrator.down();
  else if (cmd === 'status') {
    const pending  = await migrator.pending();
    const executed = await migrator.executed();
    console.log('Pending:',  pending.map(m => m.name));
    console.log('Executed:', executed.map(m => m.name));
  } else {
    console.error(`Unknown command: ${cmd}. Use up | down | status`);
    process.exit(1);
  }
  await close_all_dbs();
};

run().catch(async (err) => {
  console.error(err);
  await close_all_dbs();
  process.exit(1);
});
