import { AppRouter } from "@deplit/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanstackRouter } from "@tanstack/react-router";
import {
  createTRPCOptionsProxy,
  TRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import { trpcClient } from "./api/client";
import { routeTree } from "./routeTree.gen";

export const queryClient = new QueryClient();

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export type Context = {
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
};

export function createRouter() {
  const router = createTanstackRouter({
    routeTree,
    context: {
      queryClient,
      trpc,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // eslint-disable-next-line react/prop-types
    Wrap: ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });

  return router;
}

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
