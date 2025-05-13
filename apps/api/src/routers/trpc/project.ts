import { z } from "zod";
import { protectedProcedure, router } from "../../trpc";
import { DBProjects } from "../../db/queries/projects";
import { TRPCError } from "@trpc/server";
import { projectInsertSchema, projectUpdateSchema } from "../../db/validators";

export const projectRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const projects = await DBProjects.findAll(ctx.user.id);
    return projects;
  }),

  getById: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const project = await DBProjects.findById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return project;
    }),

  create: protectedProcedure
    .input(projectInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [result] = await DBProjects.create(ctx.user.id, input).catch(
        (error) => {
          if (
            error instanceof Error &&
            error.message.toLowerCase().includes("unique")
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "slug already taken",
            });
          }
          throw error;
        },
      );

      // TODO: schedule a deployment with the default branch and latest commit

      return result;
    }),

  update: protectedProcedure
    .input(
      projectUpdateSchema.extend({
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await DBProjects.update(input.projectId, ctx.user.id, {
        envVars: input.envVars,
        name: input.name,
        framework: input.framework,
        isSPA: input.isSPA,
      });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await DBProjects.delete(input.projectId, ctx.user.id);
      return result;
    }),
});
