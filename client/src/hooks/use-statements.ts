import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useStatements() {
  return useQuery({
    queryKey: [api.statements.list.path],
    queryFn: async () => {
      const res = await fetch(api.statements.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch statements");
      return api.statements.list.responses[200].parse(await res.json());
    },
  });
}

export function useStatement(id: number) {
  return useQuery({
    queryKey: [api.statements.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.statements.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch statement details");
      return api.statements.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUploadStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.statements.upload.path, {
        method: api.statements.upload.method,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to upload statement");
      }
      return api.statements.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.statements.list.path] });
    },
  });
}

export function useProcessStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.statements.process.path, { id });
      const res = await fetch(url, {
        method: api.statements.process.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to process statement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.statements.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
    },
  });
}

export function useDeleteStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.statements.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete statement");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.statements.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}
