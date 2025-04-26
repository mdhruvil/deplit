import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { env } from "../env.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  trustedOrigins: [env.CONTROL_PANE_URL],
  onAPIError: {
    onError(error, ctx) {
      console.error(error, ctx);
    },
  },
});

/**
 * Retrieves the first account associated with the specified user ID.
 *
 * @param userId - The unique identifier of the user whose account is to be fetched.
 * @returns The account object if found, or null if no matching account exists.
 */
export async function getAccountFromUserId(userId: string) {
  const account = await db.query.account.findFirst({
    where: (account, { eq }) => eq(account.userId, userId),
  });
  return account;
}
