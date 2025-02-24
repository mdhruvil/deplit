import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

export const db = drizzle({
  connection: env.DB_URL,
  schema,
});
