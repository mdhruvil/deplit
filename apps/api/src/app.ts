import { Hono } from "hono";
import { env } from "./env.js";

export const app = new Hono({ strict: false }).get("/", (c) => {
  c.req.raw.headers.forEach((value, key) => {
    console.log(`${key}: ${value}`);
  });
  return c.json({ message: "OK!", env });
});
