import { zValidator } from "@hono/zod-validator";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import { DBDeployments } from "../db/queries/deployments";
import { notFound } from "../utils";
import { invalidateCacheByTag } from "../lib/postbuild";
import { posthog } from "../lib/posthog";

const updateBuildStatusSchema = z.object({
  status: z.enum(["SUCCESS", "ERROR", "BUILDING"]),
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

const logSchema = z.object({
  deploymentId: z.string(),
  level: z.string(),
  message: z.string(),
  timestamp: z.coerce.date(),
});

const app = new Hono()
  .use("*", bearerAuth({ token: env.API_SIDECAR_KEY }))
  .post("/logs/ingest", zValidator("json", logSchema), async (c) => {
    const { deploymentId, message, level, timestamp } = c.req.valid("json");
    const doId = env.LOGGER.idFromName("deployment:" + deploymentId);
    const doStub = env.LOGGER.get(doId);

    c.executionCtx.waitUntil(
      doStub.pushLog({
        message,
        timestamp,
        level,
      }),
    );
    return c.json({ success: true, message: "Ingested" });
  })
  .post(
    "/logs",
    zValidator(
      "json",
      z.object({
        deploymentId: z.string(),
        logs: z.array(logSchema.omit({ deploymentId: true })),
      }),
    ),
    async (c) => {
      const data = c.req.valid("json");
      console.log("Logs", data);

      await env.LOGS.put(
        `deployment:${data.deploymentId}`,
        JSON.stringify(data.logs),
      );
      return c.json({ success: true, message: "Logs updated" });
    },
  )
  .post(
    "/build-status",
    zValidator("json", updateBuildStatusSchema),
    async (c) => {
      const { status, deploymentId, projectId } = c.req.valid("json");

      const deployment = await DBDeployments.findById(deploymentId, projectId);
      if (!deployment) {
        return notFound(c, "Deployment not found");
      }

      if (status === "BUILDING") {
        await DBDeployments.update(deploymentId, {
          buildStatus: "BUILDING",
        });
        return c.json({ success: true, message: "Build status updated" });
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
        activeState:
          deployment.target === "PRODUCTION" && status === "SUCCESS"
            ? "ACTIVE"
            : "NA",
      });

      if (status === "ERROR") {
        posthog.capture({
          distinctId: "sidecar-webhook",
          event: "deployment build error",
          properties: {
            deploymentId,
            projectId,
          },
        });
      }
      return c.json({ success: true, message: "Build status updated" });
    },
  )
  .post("/metadata", zValidator("json", metadataSchema), async (c) => {
    const { deploymentId, buildDurationMs, ...metadata } = c.req.valid("json");

    await DBDeployments.update(deploymentId, { metadata, buildDurationMs });
    return c.json({ success: true, message: "Metadata updated" });
  });

export { app as sidecarRouter };
