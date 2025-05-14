import { zValidator } from "@hono/zod-validator";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import { DBDeployments } from "../db/queries/deployments";
import { notFound } from "../utils";
import { invalidateCacheByTag } from "../lib/postbuild";

const updateBuildStatusSchema = z.object({
  status: z.enum(["SUCCESS", "ERROR"]),
  message: z.string(),
  deploymentId: z.string(),
  projectId: z.string(),
});

const routeMetadataSchema = z.object({
  route: z.string(),
  path: z.string(),
  size: z.number(),
});

const metadataSchema = z.object({
  htmlRoutes: z.array(routeMetadataSchema),
  assetsRoutes: z.array(routeMetadataSchema),
  deploymentId: z.string(),
  buildDurationMs: z.number(),
});

const app = new Hono()
  .use("*", bearerAuth({ token: env.API_SIDECAR_KEY }))

  .post(
    "/build-status",
    zValidator("json", updateBuildStatusSchema),
    async (c) => {
      const { status, deploymentId, projectId } = c.req.valid("json");

      const deployment = await DBDeployments.findById(deploymentId, projectId);
      if (!deployment) {
        return notFound(c, "Deployment not found");
      }

      if (status === "SUCCESS") {
        await DBDeployments.setAllProdDeploymentsToInactiveExcept(
          deploymentId,
          projectId,
        );

        let subdomain = deployment.project.slug;
        if (deployment.target === "PREVIEW") {
          subdomain = `${deployment.project.slug}-${deployment.gitCommitHash.slice(0, 7)}`;
        }
        await invalidateCacheByTag(`site:${subdomain}`);

        // {"commitHash":"045ad814b6c07e16c8193418dbbc899e3a3ef257","spa":true,"htmlRoutes":{"/":"index.html"}}
        // {"commitHash":"d60d2d71a08c9e174213eb34612345acb910ff50","htmlRoutes":{"/404":"404.html","/blog/html-intro":"blog/html-intro/index.html","/blog":"blog/index.html","/":"index.html","/projects":"projects/index.html","/projects/zaggonaut":"projects/zaggonaut/index.html"}}
        const htmlRoutes: Record<string, string> = {};
        if (deployment.metadata?.htmlRoutes) {
          for (const route of deployment.metadata?.htmlRoutes) {
            htmlRoutes[route.route] = route.path;
          }
        }

        const data = {
          projectId: deployment.projectId,
          commitHash: deployment.gitCommitHash,
          spa: deployment.project.isSPA,
          htmlRoutes,
        };
        await env.SITES.put(subdomain, JSON.stringify(data));
      }

      await DBDeployments.update(deploymentId, {
        buildStatus: status === "SUCCESS" ? "SUCCESS" : "FAILED",
        activeState: deployment.target === "PRODUCTION" ? "ACTIVE" : "NA",
      });
      return c.json({ success: true, message: "Build status updated" });
    },
  )
  .post("/metadata", zValidator("json", metadataSchema), async (c) => {
    const { deploymentId, buildDurationMs, ...metadata } = c.req.valid("json");

    await DBDeployments.update(deploymentId, { metadata, buildDurationMs });
    return c.json({ success: true, message: "Metadata updated" });
  });

export { app as sidecarRouter };
