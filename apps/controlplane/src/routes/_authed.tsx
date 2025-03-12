import { getSessionQueryOptions } from "@/api/get-session";
import { buttonVariants } from "@/components/ui/button";
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
    <div>
      {data?.user ? (
        <div>Hello {data.user.name}! You are logged in.</div>
      ) : (
        <div>You are not logged in.</div>
      )}
      <Outlet />
    </div>
  );
}
