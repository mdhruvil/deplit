import { Hono } from "hono";
import { z } from "zod";
import { Env } from "..";
import { DBProjects } from "../db/queries/projects";
import { projectInsertSchema, projectUpdateSchema } from "../db/validators";
import { zValidator } from "../middleware/z-validator";
import { notFound, unauthorized } from "../utils";

const app = new Hono<Env>()
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) {
      throw unauthorized();
    }

    const projects = await DBProjects.findAll(user.id);
    return c.json({ data: projects, success: true });
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
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { projectId } = c.req.valid("param");
      const project = await DBProjects.findById(projectId);

      if (!project) {
        return notFound(c, "Project not found");
      }

      return c.json({ data: project, success: true });
    },
  )

  .post("/", zValidator("json", projectInsertSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      throw unauthorized();
    }

    const projectData = c.req.valid("json");

    const result = await DBProjects.create(user.id, projectData);
    return c.json({ data: result, success: true });
  })

  .put(
    "/:projectId",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    zValidator("json", projectUpdateSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { projectId } = c.req.valid("param");
      const projectData = c.req.valid("json");

      const result = await DBProjects.update(projectId, user.id, projectData);
      return c.json({ data: result, success: true });
    },
  )

  .delete(
    "/:projectId",
    zValidator("param", z.object({ projectId: z.string().uuid() })),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        throw unauthorized();
      }

      const { projectId } = c.req.valid("param");
      const result = await DBProjects.delete(projectId, user.id);
      return c.json({ data: result, success: true });
    },
  );

export { app as projectsRouter };
