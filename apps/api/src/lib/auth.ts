import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "cloudflare:workers";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
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

export async function getAccountFromUserId(userId: string) {
  const account = await db.query.account.findFirst({
    where: (account, { eq }) => eq(account.userId, userId),
  });
  return account;
}
