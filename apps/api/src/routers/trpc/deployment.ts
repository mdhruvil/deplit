import { z } from "zod";
import { DBDeployments } from "../../db/queries/deployments";
import { protectedProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { deploymentInsertSchema } from "../../db/validators";

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
});
