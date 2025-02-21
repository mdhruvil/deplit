import { Hono } from "hono";
import { env } from "./env.js";

export const app = new Hono({ strict: false }).get("/", (c) => {
  return c.json({ message: "OK!", env });
});
