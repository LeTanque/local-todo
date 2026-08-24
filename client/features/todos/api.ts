export type TodoPriority = "low" | "medium" | "high";
export type TodoStatus = "all" | "active" | "completed";

export type Todo = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: TodoPriority;
  created_at: string;
  updated_at: string;
};

export type CreateTodoInput = {
  title: string;
  description?: string | null;
  priority?: TodoPriority;
};

export type UpdateTodoInput = Partial<
  Pick<Todo, "title" | "description" | "completed" | "priority">
>;

type TodosResponse = {
  todos: Todo[];
};

type TodoResponse = {
  todo: Todo;
};

type ApiErrorResponse = {
  error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(body?.error ?? `Request failed with status ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getTodos(status: TodoStatus = "all"): Promise<Todo[]> {
  const query = status === "all" ? "" : `?status=${status}`;
  const response = await request<TodosResponse>(`/api/todos${query}`);
  return response.todos;
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await request<TodoResponse>("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.todo;
}

export async function updateTodo(id: number, input: UpdateTodoInput): Promise<Todo> {
  const response = await request<TodoResponse>(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.todo;
}

export async function deleteTodo(id: number): Promise<void> {
  await request<void>(`/api/todos/${id}`, { method: "DELETE" });
}
