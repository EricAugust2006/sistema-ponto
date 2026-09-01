import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  allowExitOnIdle: true,
});

async function query(queryObject) {
  return pool.query(queryObject);
}

async function getClient() {
  return pool.connect();
}

export default { query, getClient };

