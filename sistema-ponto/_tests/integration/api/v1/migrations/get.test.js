import database from "@/_infra/database.js";

beforeAll(cleanDatabase);
async function cleanDatabase() {
  await database.query("drop schema public cascade; create schema public");
}

test("GET /api/v1/migrations without key should return 401", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/migrations");
  expect(res.status).toBe(401);
});

test("GET to /api/v1/migrations should return 200", async () => {
  const res = await fetch("http://127.0.0.1:3000/api/v1/migrations", {
    headers: {
      "x-admin-key": process.env.ADMIN_KEY,
    },
  });
  expect(res.status).toBe(200);

  const resBody = await res.json();
  expect(Array.isArray(resBody)).toBe(true);
  expect(resBody.length).toBeGreaterThan(0);
});
