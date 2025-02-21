import { defineConfig } from "drizzle-kit";
//@ts-expect-error This will work because we are using for drizzle-kit
import { env } from "./src/env";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DB_URL,
  },
});
