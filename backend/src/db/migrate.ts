import fs from 'fs';
import path from 'path';
import pool from './pool';

export async function applyMigrations() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(sql);
}

async function migrate() {
  await applyMigrations();
  console.log('Migration complete');
  await pool.end();
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
