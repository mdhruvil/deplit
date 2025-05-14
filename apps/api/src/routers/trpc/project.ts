import { z } from "zod";
import { protectedProcedure, router } from "../../trpc";
import { DBProjects } from "../../db/queries/projects";
import { TRPCError } from "@trpc/server";
import { projectInsertSchema, projectUpdateSchema } from "../../db/validators";
import { getAccountFromUserId } from "../../lib/auth";
import { getLastCommitForRepo } from "../../lib/github";
import { createDeploymentAndScheduleIt } from "../../lib/schedule-build";

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
    .input(projectInsertSchema.extend({ defaultBranch: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await getAccountFromUserId(ctx.user.id);
      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }
      if (!account.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No access token found",
        });
      }

      const lastCommit = await getLastCommitForRepo({
        owner: input.fullName.split("/")[0] ?? "",
        repo: input.fullName.split("/")[1] ?? "",
        ref: input.defaultBranch,
        accessToken: account.accessToken,
      });

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

      const deploymentResult = await createDeploymentAndScheduleIt({
        projectId: result.id,
        githubUrl: `https://github.com/${input.fullName}`,
        gitCommitHash: lastCommit.sha,
        gitRef: input.defaultBranch,
        gitCommitMessage: lastCommit.commit.message,
        gitCommitAuthorName:
          lastCommit.commit.author?.name ?? lastCommit.author?.login ?? "",
        alias: `${result.slug}.deplit.tech`,
        target: "PRODUCTION",
        gitCommitTimestamp: new Date(
          lastCommit.commit.author?.date ?? Date.now(),
        ),
      });
      console.log("Deployment scheduled:", deploymentResult);
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
