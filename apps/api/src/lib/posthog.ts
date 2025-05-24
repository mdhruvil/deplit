import { PostHog } from "posthog-node";

// https://posthog.com/docs/product-analytics/troubleshooting#is-it-ok-for-my-api-key-to-be-exposed-and-public
// TL;DR: Yes, it's ok to expose the token
export const posthog = new PostHog(
  "phc_UPdNPQ9L5IfsRgPI6HlHiP4npmngdn05X4ftv8Gja1r",
  {
    host: "https://us.i.posthog.com",
  },
);
