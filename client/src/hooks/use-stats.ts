import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export interface StatsFilters {
  monthFrom?: string;
  monthTo?: string;
  owner?: string;
}

export function useStats(filters?: StatsFilters) {
  return useQuery({
    queryKey: [api.stats.get.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.monthFrom) params.append("monthFrom", filters.monthFrom);
      if (filters?.monthTo) params.append("monthTo", filters.monthTo);
      if (filters?.owner) params.append("owner", filters.owner);
      
      const url = params.toString() ? `${api.stats.get.path}?${params}` : api.stats.get.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.stats.get.responses[200].parse(await res.json());
    },
  });
}
