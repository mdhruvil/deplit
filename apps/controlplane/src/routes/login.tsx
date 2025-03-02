import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  function handleLoginClick() {}
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 text-2xl font-semibold">
      <h2>Login to deplit</h2>
      <Button className="px-10 py-6 text-base">
        <p className="flex items-center gap-4">
          <GithubIcon className="size-5.5 fill-white" />
          Login with Github
        </p>
      </Button>
    </div>
  );
}
