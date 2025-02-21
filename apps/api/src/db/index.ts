import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../env.js";
import * as schema from "./schema.js";

const client = createClient({
  url: env.DB_URL,
});

export const db = drizzle({ client, schema });
