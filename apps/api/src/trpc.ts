import { initTRPC, TRPCError } from "@trpc/server";
import type { Context as HonoCtx } from "hono";
import type { Env } from ".";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import SuperJSON from "superjson";
import { ZodError } from "zod";

const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(function isAuthed(opts) {
  if (!opts.ctx.user || !opts.ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be logged in to perform this action.",
    });
  }

  return opts.next({
    ctx: {
      session: opts.ctx.session,
      user: opts.ctx.user,
    },
  });
});

export function createTRPCContext(c: HonoCtx<Env>) {
  return function ({ req, resHeaders, info }: FetchCreateContextFnOptions) {
    return {
      req,
      resHeaders,
      info,
      user: c.get("user"),
      session: c.get("session"),
    };
  };
}
export type Context = Awaited<ReturnType<ReturnType<typeof createTRPCContext>>>;
