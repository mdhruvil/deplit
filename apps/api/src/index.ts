import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "OK!" });
});

const port = process.env.PORT || 3000;

serve(
  {
    fetch: app.fetch,
    port: Number(port),
  },
  (info) => {
    console.log(`Server is running on http://${info.address}:${port}`);
  },
);
