import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Throws an HTTP 404 Not Found exception with a custom message.
 *
 * @param msg - The error message to include in the response.
 *
 * @throws {HTTPException} Always thrown with status 404 and the provided {@link msg}.
 */
export function notFound(c: Context, msg: string) {
  throw new HTTPException(404, { message: msg });
  return c.json({ error: msg, success: false }, 404);
}

/**
 * Throws an HTTP 401 Unauthorized exception with a fixed message.
 *
 * @throws {HTTPException} Always thrown to indicate unauthorized access.
 */
export function unauthorized() {
  throw new HTTPException(401, { message: "Unauthorized" });
}
