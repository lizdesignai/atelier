import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function run() {
  const sql = neon(process.env.POSTGRES_URL!);
  const res = await (sql as any)("SELECT * FROM tasks WHERE id = $1", ["54dc04e4-cc50-4e9d-8bdb-2bf7ab37bad9"]);
  console.log(res);
}
run();
