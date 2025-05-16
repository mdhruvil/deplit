import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { DurableLogger } from "./do/logger";
import { auth } from "./lib/auth";
import { authMiddleware } from "./middleware/auth";
import { githubRouter } from "./routers/github";
import { sidecarRouter } from "./routers/sidecar";
import { appRouter } from "./routers/trpc/app-router";
import { createTRPCContext } from "./trpc";
import { notFound } from "./utils";

export type Env = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

const app = new Hono<Env>({ strict: false })
  .basePath("/api")
  .use(logger(console.log))
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
  .get("/auth-redirect", (c) => {
    const redirect = c.req.query("redirect") ?? "/dashboard";
    if (!redirect.startsWith("/")) {
      return c.redirect(`${env.CONTROL_PANE_URL}/dashboard`);
    }
    return c.redirect(`${env.CONTROL_PANE_URL}${redirect}`);
  })
  .route("/github", githubRouter)
  /**
   * This router handles requests coming from the sidecar.
   * This router is secured with the `API_SIDECAR_KEY`
   */
  .route("/sidecar", sidecarRouter)
  .all("/rpc/**", (c) => {
    return fetchRequestHandler({
      endpoint: "/api/rpc",
      req: c.req.raw,
      router: appRouter,
      createContext: createTRPCContext(c),
    });
  })
  .notFound((c) => {
    return notFound(c, "Not Found. path: " + c.req.path);
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

export type AppRouter = typeof appRouter;

export { DurableLogger };
export default app;
