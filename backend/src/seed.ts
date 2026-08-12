import { seedDatabase } from './services/seedService';
import { closeDriver, testConnection } from './config/db';

async function main() {
  console.log('--- Starting CognoDB Seed Script ---');
  const conn = await testConnection();
  if (!conn.connected) {
    console.error(`[Error] Cannot seed database: Connection failed to ${conn.uri}.`);
    console.error(`Detail: ${conn.error}`);
    console.error('Please check your COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD in .env');
    process.exit(1);
  }

  const liveFlag = process.argv.includes('--live');
  try {
    const result = await seedDatabase(liveFlag);
    console.log('-----------------------------------');
    console.log(`Seed success! Source: ${result.source}`);
    console.log(`Artists: ${result.artistsSeeded}, Collaborations: ${result.edgesSeeded}`);
    console.log('-----------------------------------');
  } catch (err) {
    console.error('Failed to seed database:', err);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

main();
