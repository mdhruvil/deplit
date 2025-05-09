import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import {
  ingestLogsSchema,
  metadataSchema,
  updateBuildStatusSchema,
} from "./validators.js";

const token = process.env.DEPLIT_INTERNAL_API_TOKEN;
if (!token) {
  console.error("DEPLIT_INTERNAL_API_TOKEN environment variable is not set");
  process.exit(1);
}

const app = new Hono()
  .use("*", bearerAuth({ token }))
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
      // TODO: call backend api to update the build status
      return c.json({ ok: true });
    },
  )
  .post("/metadata", zValidator("json", metadataSchema), async (c) => {
    const metadata = c.req.valid("json");
    console.log("Metadata received:", JSON.stringify(metadata, null, 2));

    // TODO: call backend api to update the metadata
    return c.json({ ok: true });
  })
  .post("/exit", async (c) => {
    // this endpoint is used to exit the sidecar after finishing the build process so that the azure container apps jobs can be terminated
    setTimeout(() => {
      process.exit(0);
    }, 3000);
    return c.json({ ok: true });
  });

serve(
  {
    fetch: app.fetch,
    port: 9090,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
