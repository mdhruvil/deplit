import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../trpc";

export const helloRouter = router({
  hello: publicProcedure.input(z.string()).query(async ({ input }) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // if (Math.random() > 0.5) {
    throw new Error("Random error");
    // }
    return { hello: "world", input } as const;
  }),
  privateHello: protectedProcedure.query(() => {
    return { hello: "world" } as const;
  }),
});
