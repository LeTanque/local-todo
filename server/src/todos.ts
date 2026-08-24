import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "./db.js";

const priorities = ["low", "medium", "high"] as const;
type Priority = (typeof priorities)[number];

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  created_at: Date;
  updated_at: Date;
};

function validTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 200;
}

function validPriority(value: unknown): value is Priority {
  return typeof value === "string" && priorities.includes(value as Priority);
}

function todoId(request: Request, response: Response): number | undefined {
  const id = Number(request.params.id);
  if (Number.isSafeInteger(id) && id > 0) return id;

  response.status(400).json({ error: "Todo id must be a positive integer." });
  return undefined;
}

export const todosRouter = Router();

todosRouter.get("/", async (request, response) => {
  const status = request.query.status;
  const completed = status === "active" ? false : status === "completed" ? true : undefined;

  if (status !== undefined && status !== "all" && status !== "active" && status !== "completed") {
    response.status(400).json({ error: "status must be all, active, or completed." });
    return;
  }

  const result = await pool.query<Todo>(
    `SELECT id, title, completed, priority, created_at, updated_at
     FROM todos
     WHERE ($1::boolean IS NULL OR completed = $1)
     ORDER BY completed ASC, created_at DESC`,
    [completed],
  );
  response.json({ todos: result.rows });
});

todosRouter.post("/", async (request, response) => {
  const { title, priority = "medium" } = request.body as Record<string, unknown>;

  if (!validTitle(title)) {
    response.status(400).json({ error: "title must contain 1 to 200 characters." });
    return;
  }
  if (!validPriority(priority)) {
    response.status(400).json({ error: "priority must be low, medium, or high." });
    return;
  }

  const result = await pool.query<Todo>(
    `INSERT INTO todos (title, priority)
     VALUES ($1, $2)
     RETURNING id, title, completed, priority, created_at, updated_at`,
    [title.trim(), priority],
  );
  response.status(201).json({ todo: result.rows[0] });
});

todosRouter.patch("/:id", async (request, response) => {
  const id = todoId(request, response);
  if (!id) return;

  const body = request.body as Record<string, unknown>;
  const permittedFields = ["title", "completed", "priority"];
  if (!Object.keys(body).some((key) => permittedFields.includes(key))) {
    response.status(400).json({ error: "Provide title, completed, or priority." });
    return;
  }
  if ("title" in body && !validTitle(body.title)) {
    response.status(400).json({ error: "title must contain 1 to 200 characters." });
    return;
  }
  if ("completed" in body && typeof body.completed !== "boolean") {
    response.status(400).json({ error: "completed must be true or false." });
    return;
  }
  if ("priority" in body && !validPriority(body.priority)) {
    response.status(400).json({ error: "priority must be low, medium, or high." });
    return;
  }

  const result = await pool.query<Todo>(
    `UPDATE todos
     SET title = COALESCE($2, title),
         completed = COALESCE($3, completed),
         priority = COALESCE($4, priority),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, title, completed, priority, created_at, updated_at`,
    [
      id,
      "title" in body ? (body.title as string).trim() : null,
      "completed" in body ? body.completed : null,
      "priority" in body ? body.priority : null,
    ],
  );

  if (!result.rows[0]) {
    response.status(404).json({ error: "Todo not found." });
    return;
  }
  response.json({ todo: result.rows[0] });
});

todosRouter.delete("/:id", async (request, response) => {
  const id = todoId(request, response);
  if (!id) return;

  const result = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    response.status(404).json({ error: "Todo not found." });
    return;
  }
  response.status(204).end();
});
