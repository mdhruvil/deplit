import { trpc } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data, isLoading, error } = useQuery(
    trpc.github.getRepos.queryOptions(),
  );
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  return (
    <div className="p-2">
      <div className="space-y-5">
        {data?.map((repo) => (
          <div key={repo.id}>
            {Object.entries(repo).map(([key, value]) => (
              <p key={key}>
                {key}: {JSON.stringify(value)}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
