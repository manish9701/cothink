import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL?.split('?')[0];

async function migrate() {
  console.log('Connecting to Postgres database...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('Creating canvases table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "canvases" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text DEFAULT 'demo' NOT NULL,
        "name" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log('Updating thoughts table schema...');
    // We add the new columns if they do not exist
    await client.query(`
      ALTER TABLE "thoughts" ADD COLUMN IF NOT EXISTS "canvas_id" text REFERENCES "canvases"("id") ON DELETE set null;
      ALTER TABLE "thoughts" ADD COLUMN IF NOT EXISTS "x" double precision;
      ALTER TABLE "thoughts" ADD COLUMN IF NOT EXISTS "y" double precision;
      ALTER TABLE "thoughts" ADD COLUMN IF NOT EXISTS "rotation" double precision;
      ALTER TABLE "thoughts" ADD COLUMN IF NOT EXISTS "scale" double precision;
    `);

    console.log('✅ All tables and columns updated successfully!');
    await client.end();
    
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
