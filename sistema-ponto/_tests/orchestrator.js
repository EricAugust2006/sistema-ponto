import dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

import database from "@/_infra/database.js";

async function cleanDatabase() {
  await database.query("drop schema public cascade; create schema public");
}

async function runMigrations() {
  const response = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
    headers: {
      "x-admin-key": process.env.ADMIN_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao rodar migrations: ${response.status}`);
  }
}

export default { cleanDatabase, runMigrations };