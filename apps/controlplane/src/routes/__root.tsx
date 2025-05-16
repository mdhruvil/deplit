import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { Context } from "@/router";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Suspense } from "react";

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
      {/* eslint-disable-next-line turbo/no-undeclared-env-vars */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          {(async () => {
            const { TanStackRouterDevtools } = await import(
              "@tanstack/router-devtools"
            );
            return <TanStackRouterDevtools position="bottom-right" />;
          })()}
        </Suspense>
      )}
    </>
  );
}
