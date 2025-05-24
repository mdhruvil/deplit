import { env } from "cloudflare:workers";
import { PostHog } from "posthog-node";

export const posthog = new PostHog(env.POSTHOG_TOKEN, {
  host: "https://us.i.posthog.com",
});
