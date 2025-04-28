import { Hono } from "hono";
import { Env } from "..";
import { notFound, unauthorized } from "../utils";
import { DBProjects } from "../db/queries/projects";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { projectInsertSchema, projectUpdateSchema } from "../db/validators";

const app = new Hono<Env>()

  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) {
      return unauthorized(c);
    }

    const projects = await DBProjects.findAll(user.id);
    return c.json({ data: projects });
  })

  .get(
    "/:projectId",
    zValidator(
      "param",
      z.object({
        projectId: z.string().uuid(),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const project = await DBProjects.findById(projectId);

      if (!project) {
        return notFound(c, "Project not found");
      }

      return c.json({ data: project });
    },
  )

  .post("/", zValidator("json", projectInsertSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return unauthorized(c);
    }

    const projectData = c.req.valid("json");

    const result = await DBProjects.create(user.id, projectData);
    return c.json({ data: result });
  })

  .put(
    "/:projectId",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    zValidator("json", projectUpdateSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return unauthorized(c);
      }

      const { projectId } = c.req.valid("param");
      const projectData = c.req.valid("json");

      const result = await DBProjects.update(projectId, user.id, projectData);
      return c.json({ data: result });
    },
  )

  .delete(
    "/:projectId",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return unauthorized(c);
      }

      const { projectId } = c.req.valid("param");
      const result = await DBProjects.delete(projectId, user.id);
      return c.json({ data: result });
    },
  );

export { app as projectsRouter };
