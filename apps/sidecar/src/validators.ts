import { z } from "zod";

export const updateBuildStatusSchema = z.object({
  status: z.enum(["SUCCESS", "ERROR", "BUILDING"]),
  message: z.string(),
});

export const ingestLogsSchema = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.coerce.date(),
});

export const routeMetadataSchema = z.object({
  route: z.string(),
  path: z.string(),
  size: z.number(),
});

export const metadataSchema = z.object({
  htmlRoutes: z.array(routeMetadataSchema),
  assetsRoutes: z.array(routeMetadataSchema),
  buildDurationMs: z.number(),
});

export const projectDetailsRequestSchema = z.object({
  deploymentId: z.string(),
  projectId: z.string(),
});

export const projectDetailsResponseSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    fullName: z.string(),
    githubUrl: z.string(),
    framework: z.string().nullable(),
    isSPA: z.boolean(),
    envVars: z.record(z.string()).nullable(),
  }),
  githubAccessToken: z.string().nullable(),
});
