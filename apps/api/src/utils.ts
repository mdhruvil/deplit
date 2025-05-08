import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export function notFound(c: Context, msg: string) {
  throw new HTTPException(404, { message: msg });
  return c.json({ error: msg, success: false }, 404);
}

export function unauthorized() {
  throw new HTTPException(401, { message: "Unauthorized" });
}
