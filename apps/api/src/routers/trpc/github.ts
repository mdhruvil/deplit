import { TRPCError } from "@trpc/server";
import { getAccountFromUserId } from "../../lib/auth";
import { protectedProcedure, router } from "../../trpc";
import { getCurrentUserRepos } from "../../lib/github";

export const githubRouter = router({
  getRepos: protectedProcedure.query(async ({ ctx }) => {
    const account = await getAccountFromUserId(ctx.user.id);
    if (!account) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Account not found",
      });
    }
    if (!account.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No access token found",
      });
    }

    const repos = await getCurrentUserRepos(account.accessToken);

    return repos;
  }),
});
