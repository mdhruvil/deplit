import { QUERY_KEYS } from "@/api/query-keys";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/main";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search?.redirect as string) ?? "/dashboard",
    };
  },
});

function LoginComponent() {
  const githubMutation = useMutation({
    mutationFn: async () => {
      return await authClient.signIn.social({
        provider: "github",
        callbackURL: "/api/auth-redirect",
      });
    },
    onSettled: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.getSession(),
      });
      if (!data?.data?.url) {
        return console.error("No url returned from signIn.social");
      }
      throw redirect({
        to: data.data.url,
      });
    },
  });
  function handleLoginClick() {
    githubMutation.mutate();
  }
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 text-2xl font-semibold">
      <h2>Login to deplit</h2>
      <Button
        className="px-10 py-6 text-base"
        loading={githubMutation.isPending}
        onClick={handleLoginClick}
      >
        <p className="flex items-center gap-4">
          <GithubIcon className="size-5.5 fill-white" />
          Login with Github
        </p>
      </Button>
    </div>
  );
}
