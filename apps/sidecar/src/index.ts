import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import {
  ingestLogsSchema,
  metadataSchema,
  updateBuildStatusSchema,
} from "./validators.js";
import { BackendApiClient } from "./backend-api-client.js";
import { z } from "zod";

const requiredEnvVars = [
  "DEPLIT_INTERNAL_API_TOKEN",
  "DEPLIT_BACKEND_API_URL",
  "DEPLIT_API_SIDECAR_KEY",
  "DEPLIT_DEPLOYMENT_ID",
  "DEPLIT_PROJECT_ID",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const token = process.env.DEPLIT_INTERNAL_API_TOKEN!;
const backendApiUrl = process.env.DEPLIT_BACKEND_API_URL!;
const apiSidecarKey = process.env.DEPLIT_API_SIDECAR_KEY!;
const deploymentId = process.env.DEPLIT_DEPLOYMENT_ID!;
const projectId = process.env.DEPLIT_PROJECT_ID!;

const backendApiClient = new BackendApiClient(backendApiUrl, apiSidecarKey);

const logs: z.infer<typeof ingestLogsSchema>[] = [];

const app = new Hono()
  .use("*", bearerAuth({ token }))
  .post("/health", async (c) => {
    return c.json({ ok: true });
  })
  .post("/logs/ingest", zValidator("json", ingestLogsSchema), async (c) => {
    const body = c.req.valid("json");

    await backendApiClient.ingestLogs({ ...body, deploymentId });

    logs.push(body);

    return c.text("Logs received");
  })
  .post(
    "/build-status",
    zValidator("json", updateBuildStatusSchema),
    async (c) => {
      const { status, message } = c.req.valid("json");
      if (status === "SUCCESS" || status === "ERROR") {
        await new Promise((resolve) => {
          // Simulate a delay to ensure logs are processed before updating the build status
          setTimeout(resolve, 3000);
        });
        if (logs.length > 0) {
          await backendApiClient.saveLogs({
            deploymentId,
            logs,
          });
          console.log("Backend API successfully updated with logs.");
        }
      }

      await backendApiClient.updateBuildStatus({
        status,
        message,
        deploymentId,
        projectId,
      });
      console.log("Backend API successfully updated with build status.");
      return c.json({ ok: true });
    },
  )
  .post("/metadata", zValidator("json", metadataSchema), async (c) => {
    const metadata = c.req.valid("json");
    await backendApiClient.updateMetadata({ ...metadata, deploymentId });
    console.log("Backend API successfully updated with metadata.");
    return c.json({ ok: true });
  })
  .post("/exit", async (c) => {
    // this endpoint is used to exit the sidecar after finishing the build process so that the azure container apps jobs can be terminated
    setTimeout(() => {
      process.exit(0);
    }, 3000);
    return c.json({ ok: true });
  })
  .onError((err, c) => {
    console.dir(err, { depth: null });
    return c.json(
      {
        ok: false,
        message: "An error occurred",
        error: err.message,
      },
      500,
    );
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
