import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../app.js";
import { getAccountFromUserId } from "../lib/auth.js";
import { webhook } from "../lib/github-webhook.js";
import { getCurrentUserRepos } from "../lib/github.js";
import { notFound, unauthorized } from "../utils.js";
import { GithubFileSystemDetector } from "../lib/github-fs-detector.js";
import { detectFrameworkRecord } from "@vercel/fs-detectors";
import { frameworkList } from "@vercel/frameworks";

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

    return c.json({ message: "Webhook received" });
  })
  .get("/repos", async (c) => {
    const user = c.get("user");

    if (!user) {
      return unauthorized(c);
    }

    const account = await getAccountFromUserId(user.id);

    if (!account) {
      return notFound(c, "Account not found");
    }

    if (!account.accessToken) {
      return unauthorized(c);
    }

    const repos = await getCurrentUserRepos(account.accessToken);

    return c.json({
      data: repos,
    });
  })
  .get(
    "/detect-framework",
    zValidator(
      "query",
      z.object({
        githubUrl: z.string().url(),
        githubBranch: z.string().optional(),
      }),
    ),
    async (c) => {
      const user = c.get("user");

      if (!user) {
        return unauthorized(c);
      }

      const account = await getAccountFromUserId(user.id);

      if (!account) {
        return notFound(c, "Account not found");
      }

      if (!account.accessToken) {
        return unauthorized(c);
      }

      const { githubUrl, githubBranch } = c.req.valid("query");

      const repoUrl = new URL(githubUrl);

      const [owner, repo] = repoUrl.pathname.split("/").slice(1);

      if (!owner || !repo) {
        return c.json({ error: "Invalid GitHub URL" }, 400);
      }

      const fs = new GithubFileSystemDetector({
        owner,
        repo,
        initialPath: ".",
        apiToken: account.accessToken,
        ref: githubBranch,
      });

      const framework = await detectFrameworkRecord({
        fs,
        frameworkList,
      });

      if (!framework) {
        return c.json({ error: "No framework detected" }, 400);
      }
      return c.json({ data: framework });
    },
  );

export { app as githubRouter };
