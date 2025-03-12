import { createInsertSchema } from "drizzle-zod";
import { deployments, projects } from "./schema.js";
import { z } from "zod";

export const projectInsertSchema = createInsertSchema(projects).omit({
  creatorId: true,
  createdAt: true,
  updatedAt: true,
});
export const projectUpdateSchema = projectInsertSchema
  .omit({
    slug: true,
    id: true,
    githubUrl: true,
  })
  .partial();
export type ProjectInsert = z.infer<typeof projectInsertSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

export const deploymentInsertSchema = createInsertSchema(deployments).omit({
  projectId: true,
});
export const deploymentUpdateSchema = deploymentInsertSchema.partial().omit({
  id: true,
});
export type DeploymentInsert = z.infer<typeof deploymentInsertSchema>;
export type DeploymentUpdate = z.infer<typeof deploymentUpdateSchema>;
