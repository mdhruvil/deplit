import { env } from "cloudflare:workers";
import { PostHog } from "posthog-node";

console.log(
  "PostHog initialized with token:",
  env.POSTHOG_TOKEN ?? "phc_notoken",
);
export const posthog = new PostHog(env.POSTHOG_TOKEN ?? "phc_notoken", {
  host: "https://us.i.posthog.com",
});
