import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { Context } from "@/router";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRouteWithContext<Context>()({
  component: RootComponent,
  notFoundComponent: () => {
    return <NotFound />;
  },
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
