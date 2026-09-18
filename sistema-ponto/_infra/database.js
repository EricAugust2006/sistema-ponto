import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  allowExitOnIdle: true,
});

async function query(queryObject) {
  return pool.query(queryObject);
}

async function getClient() {
  return pool.connect();
}

export default { query, getClient };
