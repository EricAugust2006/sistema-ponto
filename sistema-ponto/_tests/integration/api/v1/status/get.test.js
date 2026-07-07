test("GET to /api/v1/status returns 200 and status ok", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty("status", "ok");

  const parsedUpdatedAt = new Date(data.updated_at).getTime();
  const currentTime = Date.now();

  console.log("parsedUpdatedAt:", parsedUpdatedAt);
  console.log("currentTime:", currentTime);

  expect(parsedUpdatedAt).toEqual(parsedUpdatedAt);
  expect(parsedUpdatedAt).toBeLessThanOrEqual(currentTime);
});
