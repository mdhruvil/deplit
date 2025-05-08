import { createMiddleware } from "hono/factory";
import { Env } from "..";
import { auth } from "../lib/auth";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    // TODO: remove this temp user in prod or when i figure out how to use better auth with bruno. skill issue.
    // We are using this temp user to avoid using auth when testing API with Bruno.
    // const tempUser = {
    //   id: "0dgth505g29d5nza1IlDT4n1HgJGpO6C",
    //   name: "Dhruvil Moradiya",
    //   email: "dhruvil1808@gmail.com",
    //   emailVerified: true,
    //   image: "https://avatars.githubusercontent.com/u/132185979?v=4",
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    // };
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});
