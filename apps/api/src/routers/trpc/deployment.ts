import { z } from "zod";
import { DBDeployments } from "../../db/queries/deployments";
import { protectedProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { deploymentInsertSchema } from "../../db/validators";
import { env } from "cloudflare:workers";

export const deploymentsRouter = router({
  getAll: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const deployments = await DBDeployments.findAll(input.projectId);
      return deployments;
    }),

  getById: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        deploymentId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const deployment = await DBDeployments.findById(
        input.deploymentId,
        input.projectId,
      );
      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found",
        });
      }
      return deployment;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        data: deploymentInsertSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const result = await DBDeployments.create(input.projectId, input.data);
      return result;
    }),

  pollLogs: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .query(async ({ input }) => {
      const doId = env.LOGGER.idFromName("deployment:" + input.deploymentId);
      const doStub = env.LOGGER.get(doId);
      const logs = await doStub.getLogs();

      logs.sort((a, b) => {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      return logs as {
        message: string;
        timestamp: Date;
        level: string;
      }[];
    }),

  getLogs: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .query(async ({ input }) => {
      const logs = (await env.LOGS.get(`deployment:${input.deploymentId}`, {
        type: "json",
      })) as unknown as
        | {
            message: string;
            timestamp: string;
            level: string;
          }[]
        | null;

      if (!logs) {
        return [];
      }
      // sort based on timestamp
      logs.sort((a, b) => {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      return logs as {
        message: string;
        timestamp: string;
        level: string;
      }[];
    }),
});
