import { queryOptions } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-keys";
import { authClient } from "@/lib/auth-client";

export const getSessionQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.getSession(),
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) {
        throw new Error(error.message ?? "Failed to fetch session data");
      }
      return data;
    },
  });
