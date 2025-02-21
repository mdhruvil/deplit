import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./env.js";

serve(
  {
    fetch: app.fetch,
    port: Number(env.PORT),
  },
  (info) => {
    console.log(`Server is running on http://${info.address}:${env.PORT}`);
  },
);
