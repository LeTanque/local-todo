import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";
import { pool } from "./db.js";

let baseUrl = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

before(async () => {
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

test("health confirms the database is connected", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "connected" });
});

test("invalid todo input returns a helpful 400 response", async () => {
  const response = await fetch(`${baseUrl}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "   " }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "title must contain 1 to 200 characters.",
  });
});

test("malformed JSON returns a helpful 400 response", async () => {
  const response = await fetch(`${baseUrl}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not valid JSON}",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Request body must be valid JSON." });
});

test("a todo can be created, updated, listed, and deleted", async () => {
  const title = `Integration test todo ${randomUUID()}`;
  let id: number | undefined;

  try {
    const createResponse = await fetch(`${baseUrl}/api/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority: "high" }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      todo: { id: number; title: string; completed: boolean; priority: string };
    };
    id = created.todo.id;
    assert.equal(created.todo.title, title);
    assert.equal(created.todo.completed, false);
    assert.equal(created.todo.priority, "high");

    const updateResponse = await fetch(`${baseUrl}/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true, priority: "low" }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      todo: { completed: boolean; priority: string };
    };
    assert.equal(updated.todo.completed, true);
    assert.equal(updated.todo.priority, "low");

    const listResponse = await fetch(`${baseUrl}/api/todos?status=completed`);
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as { todos: Array<{ id: number }> };
    assert.ok(listed.todos.some((todo) => todo.id === id));
  } finally {
    if (id) {
      const deleteResponse = await fetch(`${baseUrl}/api/todos/${id}`, { method: "DELETE" });
      assert.equal(deleteResponse.status, 204);
    }
  }
});

test("unknown routes return JSON 404 responses", async () => {
  const response = await fetch(`${baseUrl}/not-a-route`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Route not found." });
});
