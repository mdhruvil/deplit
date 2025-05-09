import { queryOptions } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-keys";

export const getProjectsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.getProjects(),
  });
