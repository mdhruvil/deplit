import { ZodSchema } from "zod";
import type { ValidationTargets } from "hono";
import { zValidator as zv } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

export const zValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      const error =
        `Error validating ${target} - ` +
        result.error.flatten().formErrors.join(", ") +
        Object.entries(result.error.flatten().fieldErrors)
          .map(([key, value]) => `${key}: ${value?.join(", ")}`)
          .join(", ");

      throw new HTTPException(400, {
        cause: result.error,
        message: error,
      });
    }
  });
