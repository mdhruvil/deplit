import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { deployments, projects } from "./schema";

export const projectInsertSchema = createInsertSchema(projects).omit({
  creatorId: true,
  createdAt: true,
  updatedAt: true,
});
export const projectUpdateSchema = projectInsertSchema
  .omit({
    slug: true,
    githubUrl: true,
    fullName: true,
    id: true,
  })
  .partial();
export type ProjectInsert = z.infer<typeof projectInsertSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

export const deploymentInsertSchema = createInsertSchema(deployments).omit({
  projectId: true,
});
export const deploymentUpdateSchema = deploymentInsertSchema
  .omit({
    id: true,
  })
  .partial();
export type DeploymentInsert = z.infer<typeof deploymentInsertSchema>;
export type DeploymentUpdate = z.infer<typeof deploymentUpdateSchema>;
