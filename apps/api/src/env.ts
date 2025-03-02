import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DB_URL: z.string(),
  PORT: z.string().default("3000"),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),

  CONTROL_PANE_URL: z.string().url().default("http://localhost:5173"),
});

function validateEnv(envVarsSchema: typeof envSchema, skipValidation: boolean) {
  if (skipValidation) {
    return process.env as z.infer<typeof envVarsSchema>;
  }
  const { data, success, error } = envVarsSchema.safeParse(process.env);

  if (!success || !data) {
    console.error("Invalid environment variables");
    const errors = error?.flatten().fieldErrors;
    if (!errors) {
      console.error(error);
      process.exit(1);
    }
    const formattedErrors = Object.entries(errors).map(([key, value]) => {
      return { variable: key, "error(s)": value?.join(", ") };
    });
    console.table(formattedErrors);
    process.exit(1);
  }
  return data;
}

const data = validateEnv(envSchema, process.env.SKIP_ENV_VALIDATION === "true");

export const env = data;
