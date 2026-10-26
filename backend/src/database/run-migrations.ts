import { AppDataSource } from './data-source';

async function run() {
  const opts = AppDataSource.options as any;
  console.log(`Connecting to ${opts.host}:${opts.port} db=${opts.database} user=${opts.username} hasSsl=${!!opts.ssl}...`);
  await AppDataSource.initialize();
  console.log('Running pending migrations...');
  const migrations = await AppDataSource.runMigrations();
  if (migrations.length > 0) {
    console.log(`Successfully executed ${migrations.length} migration(s):`);
    for (const m of migrations) {
      console.log(` - ${m.name}`);
    }
  } else {
    console.log('No pending migrations to run.');
  }
  await AppDataSource.destroy();
  console.log('Migration process completed successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
