import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { Context } from "@/router";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

export const Route = createRootRouteWithContext<Context>()({
  component: RootComponent,
  notFoundComponent: () => {
    return <NotFound />;
  },
});

const TanStackRouterDevtools = lazy(() =>
  import("@tanstack/router-devtools").then((module) => ({
    default: module.TanStackRouterDevtools,
  })),
);

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
      {/* eslint-disable-next-line turbo/no-undeclared-env-vars */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <TanStackRouterDevtools position="bottom-right" />;
        </Suspense>
      )}
    </>
  );
}
