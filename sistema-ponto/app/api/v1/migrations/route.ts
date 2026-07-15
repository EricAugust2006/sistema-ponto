import { join } from "node:path";
import database from "@/_infra/database.js";
import { NextRequest, NextResponse } from "next/server";
import { RunnerOption } from "node-pg-migrate";

async function getMigrationRunner() {
  const { runner: migrationRunner } = await import("node-pg-migrate");
  return migrationRunner;
}

export async function GET() {
  let dbClient;

  try {
    dbClient = await database.getNewClient();
    const migrationRunner = await getMigrationRunner();

    const defaultMigrationsOptions: RunnerOption = {
      dbClient: dbClient,
      dryRun: true,
      dir: join(process.cwd(), "_infra", "migrations"),
      direction: "up",
      verbose: true,
      migrationsTable: "pgmigrations",
    };

    const pendingMigrations = await migrationRunner(defaultMigrationsOptions);
    return NextResponse.json(pendingMigrations, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ err: "Internal Server Error" }, { status: 500 });
  } finally {
    await dbClient?.end();
  }
}

export async function POST() {
  let dbClient;

  try {
    dbClient = await database.getNewClient();
    const migrationRunner = await getMigrationRunner();

    const options: RunnerOption = {
      dbClient,
      dryRun: false,
      dir: join(process.cwd(), "_infra", "migrations"),
      direction: "up",
      verbose: true,
      migrationsTable: "pgmigrations",
    };

    const migratedMigrations = await migrationRunner(options);

    if (migratedMigrations.length > 0) {
      return NextResponse.json(migratedMigrations, { status: 201 });
    }
    return NextResponse.json(migratedMigrations, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ err: "Internal Server Error" }, { status: 500 });
  } finally {
    await dbClient?.end();
  }
}
