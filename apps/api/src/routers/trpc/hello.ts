import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../trpc";

export const helloRouter = router({
  hello: publicProcedure.input(z.string()).query(({ input }) => {
    return { hello: "world", input } as const;
  }),
  privateHello: protectedProcedure.query(() => {
    return { hello: "world" } as const;
  }),
});
