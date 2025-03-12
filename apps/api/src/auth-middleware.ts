import { createMiddleware } from "hono/factory";
import { auth } from "./lib/auth.js";
import { Env } from "./app.js";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    const tempUser = {
      id: "U3WslvrP7LRxeFctcUURUatkv46ziKa5",
      name: "Dhruvil Moradiya",
      email: "dhruvil1808@gmail.com",
      emailVerified: true,
      image: "https://avatars.githubusercontent.com/u/132185979?v=4",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    c.set("user", tempUser);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});
