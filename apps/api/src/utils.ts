import { Context } from "hono";

export function notFound(c: Context, msg: string) {
  return c.json({ error: msg }, 404);
}

export function unauthorized(c: Context) {
  return c.json({ error: "Unauthorized" }, 401);
}
