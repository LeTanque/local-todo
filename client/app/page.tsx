"use client";

import { useState, type FormEvent } from "react";
import type { TodoStatus } from "@/features/todos/api";
import { TodoItem } from "@/features/todos/TodoItem";
import { useCreateTodo, useTodos } from "@/features/todos/hooks";

const filters: { label: string; value: TodoStatus }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export default function Home() {
  const [status, setStatus] = useState<TodoStatus>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data: todos = [], error, isLoading } = useTodos(status);
  const createTodo = useCreateTodo();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle) return;

    createTodo.mutate(
      {
        title: trimmedTitle,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
        },
      },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : createTodo.error instanceof Error
        ? createTodo.error.message
        : null;

  return (
    <main className="m-3 todos-main">
      <div className="todos-frame">
        <div className="flex flex-col flex-1 font-sans dark:bg-black todos-frame todos-frame-inset">
          <header className="todo-frame title">
            <h1 className="todo title">Tasks & Todos</h1>
          </header>

          <form className="todo-frame no-border flex-wrap" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="new-todo">
              New todo
            </label>
            <input
              className="todo bg-transparent"
              id="new-todo"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="> Add a task"
              value={title}
            />
            <button
              disabled={createTodo.isPending}
              type="submit"
              className="button"
            >
              {createTodo.isPending ? "Adding..." : "Add"}
            </button>
            <label className="sr-only" htmlFor="new-todo-description">
              Description
            </label>
            <textarea
              className="todo-description-input"
              disabled={createTodo.isPending}
              id="new-todo-description"
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="> Description (optional)"
              rows={2}
              value={description}
            />
          </form>

          <div className="todo-frame">
            <label className="todo" htmlFor="todo-filter">
              &nbsp;
            </label>
            <select
              id="todo-filter"
              onChange={(event) => setStatus(event.target.value as TodoStatus)}
              value={status}
              className="select-filter"
            >
              {filters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading && <p className="todo-frame">Loading todos…</p>}
          {message && (
            <p className="todo-frame" role="alert">
              {message}
            </p>
          )}

          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}

          {!isLoading && !error && todos.length === 0 && (
            <p className="todo-frame todo">No todos yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
