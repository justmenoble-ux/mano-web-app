import { useQuery } from "@tanstack/react-query";
import type { Household } from "@shared/schema";

export function useHousehold() {
  return useQuery<Household | null>({
    queryKey: ["/api/household"],
  });
}

