"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { Todo } from "./api";
import { LinkedText } from "./LinkedText";
import { useDeleteTodo, useUpdateTodo } from "./hooks";

type TodoItemProps = {
  todo: Todo;
};

export function TodoItem({ todo }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftDescription, setDraftDescription] = useState(todo.description ?? "");
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  function startEditing() {
    setDraftTitle(todo.title);
    setDraftDescription(todo.description ?? "");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftTitle(todo.title);
    setDraftDescription(todo.description ?? "");
    setIsEditing(false);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) return;

    const nextDescription = draftDescription.trim() || null;
    const titleUnchanged = trimmedTitle === todo.title;
    const descriptionUnchanged = nextDescription === (todo.description ?? null);
    if (titleUnchanged && descriptionUnchanged) {
      setIsEditing(false);
      return;
    }

    updateTodo.mutate(
      {
        id: todo.id,
        input: { title: trimmedTitle, description: nextDescription },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  const isBusy = updateTodo.isPending || deleteTodo.isPending;
  const message =
    updateTodo.error instanceof Error
      ? updateTodo.error.message
      : deleteTodo.error instanceof Error
        ? deleteTodo.error.message
        : null;

  if (isEditing) {
    return (
      <form className="todo-frame todo-item flex-wrap" onSubmit={handleSave}>
        <label className="sr-only" htmlFor={`edit-todo-${todo.id}`}>
          Edit todo
        </label>
        <input
          autoFocus
          className="todo bg-transparent"
          disabled={updateTodo.isPending}
          id={`edit-todo-${todo.id}`}
          maxLength={200}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          value={draftTitle}
        />
        <button
          className="button"
          disabled={updateTodo.isPending || !draftTitle.trim()}
          type="submit"
        >
          {updateTodo.isPending ? "Saving..." : "Save"}
        </button>
        <button
          className="button"
          disabled={updateTodo.isPending}
          onClick={cancelEditing}
          type="button"
        >
          Cancel
        </button>
        <label className="sr-only" htmlFor={`edit-todo-description-${todo.id}`}>
          Edit description
        </label>
        <textarea
          className="todo-description-input"
          disabled={updateTodo.isPending}
          id={`edit-todo-description-${todo.id}`}
          maxLength={1000}
          onChange={(event) => setDraftDescription(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="> Description (optional)"
          rows={2}
          value={draftDescription}
        />
        {message && (
          <p className="basis-full todo" role="alert">
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="todo-frame todo-item todo-item-view">
      <div className="todo-main">
        <p className={`todo ${todo.completed ? "completed" : "incomplete"}`}>
          <LinkedText text={todo.title} />
        </p>
        <input
          aria-label={
            todo.completed ? `Mark ${todo.title} as active` : `Mark ${todo.title} as completed`
          }
          checked={todo.completed}
          className={`w-4 h-4 focus:ring-2 focus:ring-brand-soft checkmark ${todo.completed ? "completed" : "incomplete"}`}
          disabled={isBusy}
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
          aria-label={`Edit ${todo.title}`}
          className="button"
          disabled={isBusy}
          onClick={startEditing}
          type="button"
        >
          Edit
        </button>
        <button
          aria-label={`Delete ${todo.title}`}
          className="button"
          disabled={isBusy}
          onClick={() => deleteTodo.mutate(todo.id)}
          type="button"
        >
          Delete
        </button>
      </div>
      {todo.description && (
        <p className={`todo-description ${todo.completed ? "completed" : ""}`}>
          <LinkedText text={todo.description} />
        </p>
      )}
      {message && (
        <p className="todo" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
