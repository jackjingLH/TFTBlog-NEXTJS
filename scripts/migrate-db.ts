import { openGuideContentStore } from '../lib/guide-content-store';

async function runMigration() {
  console.log('Running database migration...');
  const store = await openGuideContentStore();
  await store.close();
  console.log('Migration completed successfully!');
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
