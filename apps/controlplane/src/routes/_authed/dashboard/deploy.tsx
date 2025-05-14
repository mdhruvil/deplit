import { Error } from "@/components/error";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/router";
import { zodResolver as hookformZodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { GitBranchIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z, ZodError } from "zod";

export const Route = createFileRoute("/_authed/dashboard/deploy")({
  component: DeployComponent,
  validateSearch: zodValidator(
    z.object({
      owner: z.string(),
      repo: z.string(),
      defaultBranch: z.string(),
    }),
  ),
  errorComponent: ({ error }) => {
    let errorMsg = error.message;

    if (error.cause instanceof ZodError) {
      errorMsg = Object.entries(error.cause.flatten().fieldErrors)
        .map(
          ([key, value]) =>
            `${key.at(0)?.toUpperCase() + key.slice(1)}: ${value?.join(", ")}`,
        )
        .join(", ");
    }

    return <Error message={errorMsg} />;
  },
});

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters long",
  }),
  slug: z
    .string()
    .min(3, {
      message: "Slug must be at least 3 characters long",
    })
    .max(30, {
      message: "Slug must be at most 30 characters long",
    })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must only contain lowercase letters, numbers, and hyphens",
    }),
  isSPA: z.boolean(),
});

function DeployComponent() {
  const { owner, repo, defaultBranch } = Route.useSearch();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: hookformZodResolver(formSchema),
    defaultValues: {
      name: repo,
      slug: repo.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isSPA: false,
    },
  });

  const createProjectMutation = useMutation(
    trpc.project.create.mutationOptions({
      onError(error) {
        console.log("Error creating project:", error);
        toast.error(error.message ?? "Something went wrong.");
      },
      onSettled: async (data) => {
        if (data) {
          await queryClient.invalidateQueries({
            queryKey: trpc.project.getAll.queryKey(),
            refetchType: "none",
          });
          await router.invalidate({
            filter: ({ routeId }) => routeId === "/_authed/dashboard/",
          });
        }
      },
      onSuccess: (data) => {
        if (!data) {
          console.log("data is undefined");
          toast.error("data is undefined. So could not navigate");
          return;
        }
        router.navigate({
          to: "/dashboard/project/$projectId",
          params: { projectId: data.id },
        });
      },
    }),
  );

  function onSubmit(data: z.infer<typeof formSchema>) {
    createProjectMutation.mutate({
      name: data.name,
      fullName: `${owner}/${repo}`,
      githubUrl: `https://github.com/${owner}/${repo}`,
      slug: data.slug,
      isSPA: data.isSPA,
      defaultBranch,
    });
  }

  const nameValue = form.watch("name");

  useEffect(() => {
    const newSlug = nameValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    form.setValue("slug", newSlug, {
      shouldValidate: true,
    });
  }, [nameValue, form]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    form.setValue("slug", newSlug, { shouldValidate: true });
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>New Project</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="space-y-8">
            <div className="bg-accent space-y-1 rounded-[5px] p-2">
              <p className="text-muted-foreground text-xs">
                Importing from GitHub
              </p>
              <a
                className="flex items-center gap-2"
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noreferrer"
              >
                <GithubIcon className="size-4" />
                <span>
                  {owner}/{repo}
                </span>
                <GitBranchIcon className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-sm">
                  {defaultBranch}
                </span>
              </a>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl className="first:mt-2">
                      <div className="flex rounded-md shadow-xs">
                        <Input
                          className="z-10 -me-px rounded-e-none shadow-none"
                          placeholder="google"
                          type="text"
                          {...field}
                          onChange={handleSlugChange}
                        />
                        <span className="border-input bg-accent text-muted-foreground inline-flex items-center rounded-e-md border px-3 text-sm">
                          .deplit.tech
                        </span>
                      </div>
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isSPA"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>
                      <div className="space-y-1 leading-none">
                        <p>SPA Mode</p>
                        <FormDescription>
                          When SPA mode is enabled, all the requests will be
                          rewritten to
                          <code className="bg-accent relative inline-block rounded px-[0.3rem] py-[0.2rem] font-mono text-sm">
                            /index.html
                          </code>
                        </FormDescription>
                      </div>
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" loading={createProjectMutation.isPending}>
              Create
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
