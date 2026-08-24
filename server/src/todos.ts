import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "./db.js";

const priorities = ["low", "medium", "high"] as const;
type Priority = (typeof priorities)[number];

type Todo = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  created_at: Date;
  updated_at: Date;
};

const todoColumns = "id, title, description, completed, priority, created_at, updated_at";

function validTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 200;
}

function validPriority(value: unknown): value is Priority {
  return typeof value === "string" && priorities.includes(value as Priority);
}

function validDescription(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === "string" && value.trim().length <= 1000;
}

function normalizeDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
    `SELECT ${todoColumns}
     FROM todos
     WHERE ($1::boolean IS NULL OR completed = $1)
     ORDER BY completed ASC, created_at DESC`,
    [completed],
  );
  response.json({ todos: result.rows });
});

todosRouter.post("/", async (request, response) => {
  const { title, description, priority = "medium" } = request.body as Record<string, unknown>;

  if (!validTitle(title)) {
    response.status(400).json({ error: "title must contain 1 to 200 characters." });
    return;
  }
  if (!validDescription(description)) {
    response.status(400).json({ error: "description must be a string of at most 1000 characters." });
    return;
  }
  if (!validPriority(priority)) {
    response.status(400).json({ error: "priority must be low, medium, or high." });
    return;
  }

  const result = await pool.query<Todo>(
    `INSERT INTO todos (title, description, priority)
     VALUES ($1, $2, $3)
     RETURNING ${todoColumns}`,
    [title.trim(), normalizeDescription(description), priority],
  );
  response.status(201).json({ todo: result.rows[0] });
});

todosRouter.patch("/:id", async (request, response) => {
  const id = todoId(request, response);
  if (!id) return;

  const body = request.body as Record<string, unknown>;
  const permittedFields = ["title", "description", "completed", "priority"];
  if (!Object.keys(body).some((key) => permittedFields.includes(key))) {
    response.status(400).json({ error: "Provide title, description, completed, or priority." });
    return;
  }
  if ("title" in body && !validTitle(body.title)) {
    response.status(400).json({ error: "title must contain 1 to 200 characters." });
    return;
  }
  if ("description" in body && !validDescription(body.description)) {
    response.status(400).json({ error: "description must be a string of at most 1000 characters." });
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
         description = CASE WHEN $5::boolean THEN $6 ELSE description END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING ${todoColumns}`,
    [
      id,
      "title" in body ? (body.title as string).trim() : null,
      "completed" in body ? body.completed : null,
      "priority" in body ? body.priority : null,
      "description" in body,
      "description" in body ? normalizeDescription(body.description) : null,
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
