test("GET to /api/v1/status returns 200 and status ok", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty("status", "health");

  const parsedUpdatedAt = new Date(data.updated_at).toISOString();
  expect(data.updated_at).toEqual(parsedUpdatedAt);

  expect(data.dependencies.database.version).toMatch(/^18\./);
  expect(data.dependencies.database.max_connections).toBeGreaterThan(0);
  expect(data.dependencies.database.opened_connections).toEqual(1);
});
