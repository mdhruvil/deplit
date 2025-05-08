import { Webhooks } from "@octokit/webhooks";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { Env } from "..";
import { getAccountFromUserId } from "../lib/auth";
import { getCurrentUserRepos } from "../lib/github";
import { notFound, unauthorized } from "../utils";
import { handleGithubPushEvent } from "../lib/github-webhook";

const app = new Hono<Env>()
  .post("/webhook", async (c) => {
    const signature = c.req.raw.headers.get("x-hub-signature-256");
    const id = c.req.raw.headers.get("x-github-delivery");
    const event = c.req.raw.headers.get("x-github-event");

    if (!signature || !id || !event) {
      console.error("Missing headers", {
        signature,
        id,
        event,
      });
      return c.json({ error: "Missing headers" }, 400);
    }

    const body = await c.req.raw.text();

    const webhook = new Webhooks({
      secret: env.GITHUB_WEBHOOK_SECRET,
    });

    webhook.on("push", handleGithubPushEvent);

    const isValid = await webhook.verify(body, signature);

    if (!isValid) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    await webhook.receive({
      id,
      // @ts-expect-error issue with types
      name: event,
      payload: JSON.parse(body),
    });

    return c.json({ message: "Webhook received", success: true });
  })
  .get("/repos", async (c) => {
    const user = c.get("user");

    if (!user) {
      throw unauthorized();
    }

    const account = await getAccountFromUserId(user.id);

    if (!account) {
      return notFound(c, "Account not found");
    }

    if (!account.accessToken) {
      throw unauthorized();
    }

    const repos = await getCurrentUserRepos(account.accessToken);

    return c.json({
      data: repos,
      success: true,
    });
  });

export { app as githubRouter };
