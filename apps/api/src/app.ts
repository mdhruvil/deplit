import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./auth-middleware.js";
import { env } from "./env.js";
import { auth } from "./lib/auth.js";
import { projectsRouter } from "./routers/projects.js";

export type Env = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export const app = new Hono<Env>({ strict: false })
  .basePath("/api")
  .use(
    "*",
    cors({
      origin: env.CONTROL_PANE_URL,
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  )
  .use(authMiddleware)
  .get("/", (c) => {
    console.log("Hello World");
    console.log(process.env);
    console.log("\n\n\n\n\n\n");
    return c.json({ message: "Hello, World! 2.0" });
  })
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .get("/auth-redirect", (c) => c.redirect(`${env.CONTROL_PANE_URL}/profile`))
  .route("/project", projectsRouter)
  .onError((err, c) => {
    return c.json({ error: err.message }, 500);
  });
