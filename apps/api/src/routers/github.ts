import { Webhooks } from "@octokit/webhooks";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Env } from "..";
import { handleGithubPushEvent } from "../lib/github-webhook";
import { posthog } from "../lib/posthog";

const app = new Hono<Env>().post("/webhook", async (c) => {
  const signature = c.req.raw.headers.get("x-hub-signature-256");
  const id = c.req.raw.headers.get("x-github-delivery");
  const event = c.req.raw.headers.get("x-github-event");

  if (!signature || !id || !event) {
    console.error("Missing headers", {
      signature,
      id,
      event,
    });
    throw new HTTPException(400, { message: "Missing headers" });
  }

  const body = await c.req.raw.text();

  const webhook = new Webhooks({
    secret: env.GITHUB_WEBHOOK_SECRET,
  });

  webhook.on("push", handleGithubPushEvent);

  const isValid = await webhook.verify(body, signature);

  if (!isValid) {
    throw new HTTPException(401, { message: "Invalid signature" });
  }

  await webhook.receive({
    id,
    // @ts-expect-error issue with types
    name: event,
    payload: JSON.parse(body),
  });

  return c.json({ message: "Webhook received", success: true });
});

export { app as githubRouter };
