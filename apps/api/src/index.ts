import { Hono } from "hono";
import { auth } from "./lib/auth";
import { cors } from "hono/cors";
import { env } from "cloudflare:workers";
import { authMiddleware } from "./middleware/auth";
import { projectsRouter } from "./routers/projects";
import { deploymentsRouter } from "./routers/deployments";

export type Env = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

const app = new Hono<Env>({ strict: false })
  .basePath("/api")
  .use(
    "*",
    cors({
      origin: [env.CONTROL_PANE_URL],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  )
  .use(authMiddleware)
  .get("/", (c) => {
    console.log("Hell yeahh");
    return c.json({ message: "hell yeah" });
  })
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .get("/auth-redirect", (c) => c.redirect(`${env.CONTROL_PANE_URL}/profile`))
  .route("/project", projectsRouter)
  .route("/project/:projectId/deployment", deploymentsRouter)
  .onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message }, 500);
  });

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
