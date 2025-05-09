import { getSessionQueryOptions } from "@/api/get-session";
import { buttonVariants } from "@/components/ui/button";
import { UserProfileButton } from "@/components/user-profile-button";
import { queryClient } from "@/main";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  loader: () => queryClient.ensureQueryData(getSessionQueryOptions()),
  onError() {
    throw redirect({
      to: "/login",
      search: {
        redirect: location.pathname,
      },
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, error } = useQuery(getSessionQueryOptions());
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return (
      <div className="space-y-3 p-4">
        <h3>You are not logged in.</h3>
        <Link
          to="/login"
          className={buttonVariants()}
          search={{ redirect: "/profile" }}
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="mx-auto max-w-5xl px-6 py-3 lg:max-w-6xl">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src="/logo.svg" alt="deplit" className="size-8" />
              <h1 className="text-foreground text-2xl font-semibold">Deplit</h1>
            </Link>

            <UserProfileButton name={data.user.name} email={data.user.email} />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-6 py-8 lg:max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
