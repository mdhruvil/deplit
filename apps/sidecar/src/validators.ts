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
