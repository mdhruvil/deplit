import { z } from "zod";
import { protectedProcedure, router } from "../../trpc";
import { DBProjects } from "../../db/queries/projects";
import { TRPCError } from "@trpc/server";
import { projectInsertSchema, projectUpdateSchema } from "../../db/validators";
import { getAccountFromUserId } from "../../lib/auth";
import { getLastCommitForRepo } from "../../lib/github";
import { createDeploymentAndScheduleIt } from "../../lib/schedule-build";
import { DBDeployments } from "../../db/queries/deployments";
import { env } from "cloudflare:workers";
import { invalidateCacheByTag } from "../../lib/postbuild";
import { posthog } from "../../lib/posthog";

export const projectRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    posthog.capture({
      distinctId: ctx.user.id,
      event: "project get all",
    });
    const projects = await DBProjects.findAll(ctx.user.id);
    return projects;
  }),

  getById: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const project = await DBProjects.findById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      posthog.capture({
        distinctId: ctx.user.id,
        event: "project get by id",
        properties: {
          projectId: project.id,
          projectName: project.name,
        },
      });
      return project;
    }),

  instantRollback: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        deploymentId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, deploymentId } = input;
      const deployment = await DBDeployments.findById(deploymentId, projectId);
      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found",
        });
      }

      if (deployment.target !== "PRODUCTION") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only production deployments can be rolled back",
        });
      }

      const promises = [
        DBDeployments.setAllProdDeploymentsToInactiveExcept(
          deploymentId,
          projectId,
        ),
        DBDeployments.update(deploymentId, {
          activeState: "ACTIVE",
        }),
      ];

      await Promise.all(promises);

      let subdomain = deployment.project.slug;
      await invalidateCacheByTag(`site:${subdomain}`);

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

      posthog.capture({
        distinctId: ctx.user.id,
        event: "project instant rollback",
        properties: {
          projectId: deployment.projectId,
          deploymentId: deployment.id,
          commitHash: deployment.gitCommitHash,
        },
      });
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

      posthog.capture({
        distinctId: ctx.user.id,
        event: "project create",
        properties: {
          projectId: result.id,
          projectName: result.name,
        },
      });

      const deploymentResult = await createDeploymentAndScheduleIt({
        projectId: result.id,
        githubUrl: `https://github.com/${input.fullName}`,
        gitCommitHash: lastCommit.sha,
        gitRef: input.defaultBranch,
        gitCommitMessage: lastCommit.commit.message,
        gitCommitAuthorName:
          lastCommit.author?.name ?? lastCommit.author?.name ?? "",
        alias: `${result.slug}.deplit.tech`,
        target: "PRODUCTION",
        gitCommitTimestamp: new Date(
          lastCommit.commit.author?.date ?? Date.now(),
        ),
      });
      posthog.capture({
        distinctId: ctx.user.id,
        event: "deployment scheduled",
        properties: {
          projectId: result.id,
          gitRef: input.defaultBranch,
          gitCommitHash: lastCommit.sha,
          target: "PRODUCTION",
          alias: `${result.slug}.deplit.tech`,
        },
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
