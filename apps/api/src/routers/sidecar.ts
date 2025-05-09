import { zValidator } from "@hono/zod-validator";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import { DBDeployments } from "../db/queries/deployments";
import { notFound } from "../utils";

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
