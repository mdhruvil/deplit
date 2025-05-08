import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { auth } from "./lib/auth";
import { authMiddleware } from "./middleware/auth";
import { deploymentsRouter } from "./routers/deployments";
import { projectsRouter } from "./routers/projects";
import { notFound } from "./utils";

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
    return c.json({ success: true, message: "Hello Hono!" });
  })
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .get("/auth-redirect", (c) => c.redirect(`${env.CONTROL_PANE_URL}/profile`))
  .route("/project", projectsRouter)
  .route("/project/:projectId/deployment", deploymentsRouter)
  .notFound((c) => {
    return notFound(c, "Not Found");
  })
  .onError((err, c) => {
    console.error(err);
    if (err instanceof HTTPException) {
      return c.json({ success: false, error: err.message }, err.status);
    } else {
      return c.json(
        { success: false, error: err.message ?? "Internal Server Error" },
        500,
      );
    }
  });

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
