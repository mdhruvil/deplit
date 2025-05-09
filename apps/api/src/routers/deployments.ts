import { Hono } from "hono";
import { z } from "zod";
import { Env } from "..";
import { DBDeployments } from "../db/queries/deployments";
import {
  deploymentInsertSchema,
  deploymentUpdateSchema,
} from "../db/validators";
import { zValidator } from "../middleware/z-validator";
import { notFound, unauthorized } from "../utils";

const app = new Hono<Env>()
  .get(
    "/",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { projectId } = c.req.valid("param");

      const deployments = await DBDeployments.findAll(projectId);
      return c.json({ data: deployments, success: true });
    },
  )

  .get(
    "/:deploymentId",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
        deploymentId: z.string().uuid(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { projectId, deploymentId } = c.req.valid("param");
      const deployment = await DBDeployments.findById(deploymentId, projectId);

      if (!deployment) {
        return notFound(c, "Deployment not found");
      }

      return c.json({ data: deployment, success: true });
    },
  )

  .post(
    "/",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
      }),
    ),
    zValidator("json", deploymentInsertSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }
      const { projectId } = c.req.valid("param");
      const deploymentData = c.req.valid("json");

      const result = await DBDeployments.create(projectId, deploymentData);
      return c.json({ data: result, success: true });
    },
  )

  .put(
    "/:deploymentId",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
        deploymentId: z.string().uuid(),
      }),
    ),
    zValidator("json", deploymentUpdateSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { deploymentId } = c.req.valid("param");
      const deploymentData = c.req.valid("json");

      const result = await DBDeployments.update(deploymentId, deploymentData);
      return c.json({ data: result, success: true });
    },
  )

  .delete(
    "/:deploymentId",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
        deploymentId: z.string().uuid(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { deploymentId } = c.req.valid("param");
      const result = await DBDeployments.delete(deploymentId);
      return c.json({ data: result, success: true });
    },
  );

export { app as deploymentsRouter };
