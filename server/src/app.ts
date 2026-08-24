import express, { type ErrorRequestHandler } from "express";
import { pool } from "./db.js";
import { todosRouter } from "./todos.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api/todos", todosRouter);

  app.get("/health", async (_request, response) => {
    try {
      await pool.query("SELECT 1");
      response.json({ status: "ok", database: "connected" });
    } catch (error) {
      console.error("Health check database query failed:", error);
      response.status(503).json({ status: "unavailable", database: "disconnected" });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: "Route not found." });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (
      error instanceof SyntaxError &&
      "type" in error &&
      error.type === "entity.parse.failed"
    ) {
      response.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }

    console.error("Unhandled request error:", error);
    response.status(500).json({ error: "Internal server error." });
  };
  app.use(errorHandler);

  return app;
}
