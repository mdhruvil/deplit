import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { ingestLogsSchema, updateBuildStatusSchema } from "./validators.js";

const app = new Hono()
  .use("*", (c, next) => {
    const token = process.env.INTERNAL_API_TOKEN;
    if (!token) {
      console.error("INTERNAL_API_TOKEN environment variable is not set");
      return c.text("Server configuration error", 500);
    }
    return bearerAuth({ token })(c, next);
  })
  .post("/logs/ingest", zValidator("json", ingestLogsSchema), async (c) => {
    const body = c.req.valid("json");
    console.log(
      `${body.timestamp.toISOString()} [${body.level.toUpperCase()}]: ${body.message}`,
    );
    return c.text("Logs received");
  })
  .post(
    "/build-status",
    zValidator("json", updateBuildStatusSchema),
    async (c) => {
      const { status, message } = c.req.valid("json");
      console.log("Build status updated:", status, message);
      return c.text("Build status updated");
    },
  );

serve(
  {
    fetch: app.fetch,
    port: 9090,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
