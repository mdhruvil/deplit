import { TRPCError } from "@trpc/server";
import { getAccountFromUserId } from "../../lib/auth";
import { protectedProcedure, router } from "../../trpc";
import { getCurrentUserRepos } from "../../lib/github";

export const githubRouter = router({
  getRepos: protectedProcedure.query(async ({ ctx }) => {
    try {
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

      // Add timeout to prevent hanging promises
      const reposPromise = getCurrentUserRepos(account.accessToken);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("GitHub API request timed out")),
          10000,
        );
      });

      // Race the actual request against a timeout
      const repos = await Promise.race([reposPromise, timeoutPromise]).catch(
        (error) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch GitHub repositories: ${error.message}`,
            cause: error,
          });
        },
      );

      return repos as Awaited<ReturnType<typeof getCurrentUserRepos>>;
    } catch (error) {
      console.error("Errors in getRepos procedure:", error);
      throw error instanceof TRPCError
        ? error
        : new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
    }
  }),
});
