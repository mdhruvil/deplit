import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../app.js";
import { DBDeployments } from "../db/queries/deployments.js";
import {
  deploymentInsertSchema,
  deploymentUpdateSchema,
} from "../db/validators.js";
import { notFound, unauthorized } from "../utils.js";

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
      const { projectId } = c.req.valid("param");

      const deployments = await DBDeployments.findAll(projectId);
      return c.json({ data: deployments });
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
      const { projectId, deploymentId } = c.req.valid("param");
      const deployment = await DBDeployments.findById(deploymentId, projectId);

      if (!deployment) {
        return notFound(c, "Deployment not found");
      }

      return c.json({ data: deployment });
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
        return unauthorized(c);
      }
      const { projectId } = c.req.valid("param");
      const deploymentData = c.req.valid("json");

      const result = await DBDeployments.create(projectId, deploymentData);
      return c.json({ data: result });
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
        return unauthorized(c);
      }

      const { deploymentId } = c.req.valid("param");
      const deploymentData = c.req.valid("json");

      const result = await DBDeployments.update(deploymentId, deploymentData);
      return c.json({ data: result });
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
        return unauthorized(c);
      }

      const { deploymentId } = c.req.valid("param");
      const result = await DBDeployments.delete(deploymentId);
      return c.json({ data: result });
    },
  );

export { app as deploymentsRouter };
