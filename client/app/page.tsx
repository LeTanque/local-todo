"use client";

import { useState, type FormEvent } from "react";
import type { TodoStatus } from "@/features/todos/api";
import {
  useCreateTodo,
  useDeleteTodo,
  useTodos,
  useUpdateTodo,
} from "@/features/todos/hooks";

const filters: { label: string; value: TodoStatus }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export default function Home() {
  const [status, setStatus] = useState<TodoStatus>("all");
  const [title, setTitle] = useState("");
  const { data: todos = [], error, isLoading } = useTodos(status);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    createTodo.mutate(
      { title: trimmedTitle },
      { onSuccess: () => setTitle("") },
    );
  }

  const mutationError =
    createTodo.error ?? updateTodo.error ?? deleteTodo.error;
  const message =
    error instanceof Error
      ? error.message
      : mutationError instanceof Error
        ? mutationError.message
        : null;

  return (
    <main className="m-3 todos-main">
      <div className="todos-frame">
        <div className="flex flex-col flex-1 font-sans dark:bg-black todos-frame todos-frame-inset">
          <header className="todo-frame title">
            <h1 className="todo title">Tasks & Todos</h1>
          </header>

          <form className="todo-frame no-border" onSubmit={handleSubmit}>
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
            <div className="todo-frame" key={todo.id}>
              <label
                className={`todo ${todo.completed ? "completed" : "incomplete"}`}
                htmlFor={`todo-${todo.id}`}
              >
                {todo.title}
              </label>
              <input
                checked={todo.completed}
                className={`w-4 h-4  focus:ring-2 focus:ring-brand-soft checkmark ${todo.completed ? "completed" : "incomplete"}`}
                disabled={updateTodo.isPending}
                id={`todo-${todo.id}`}
                onChange={() =>
                  updateTodo.mutate({
                    id: todo.id,
                    input: { completed: !todo.completed },
                  })
                }
                type="checkbox"
              />
              <button
                aria-label={`Delete ${todo.title}`}
                disabled={deleteTodo.isPending}
                onClick={() => deleteTodo.mutate(todo.id)}
                type="button"
                className="button"
              >
                Delete
              </button>
            </div>
          ))}

          {!isLoading && !error && todos.length === 0 && (
            <p className="todo-frame todo">No todos yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
