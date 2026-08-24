import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  type CreateTodoInput,
  type TodoStatus,
  type UpdateTodoInput,
} from "./api";

export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (status: TodoStatus) => [...todoKeys.lists(), status] as const,
};

export function useTodos(status: TodoStatus = "all") {
  return useQuery({
    queryKey: todoKeys.list(status),
    queryFn: () => getTodos(status),
  });
}

function useInvalidateTodos() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
}

export function useCreateTodo() {
  const invalidateTodos = useInvalidateTodos();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(input),
    onSuccess: invalidateTodos,
  });
}

export type UpdateTodoVariables = {
  id: number;
  input: UpdateTodoInput;
};

export function useUpdateTodo() {
  const invalidateTodos = useInvalidateTodos();

  return useMutation({
    mutationFn: ({ id, input }: UpdateTodoVariables) => updateTodo(id, input),
    onSuccess: invalidateTodos,
  });
}

export function useDeleteTodo() {
  const invalidateTodos = useInvalidateTodos();

  return useMutation({
    mutationFn: (id: number) => deleteTodo(id),
    onSuccess: invalidateTodos,
  });
}
