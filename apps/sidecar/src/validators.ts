import { z } from "zod";

export const updateBuildStatusSchema = z.object({
  status: z.enum(["SUCCESS", "ERROR"]),
  message: z.string(),
});

export const ingestLogsSchema = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.coerce.date(),
});
