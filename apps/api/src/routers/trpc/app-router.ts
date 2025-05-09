import { router } from "../../trpc";
import { deploymentsRouter } from "./deployment";
import { githubRouter } from "./github";
import { helloRouter } from "./hello";
import { projectRouter } from "./project";

export const appRouter = router({
  hello: helloRouter,
  project: projectRouter,
  deployment: deploymentsRouter,
  github: githubRouter,
});
