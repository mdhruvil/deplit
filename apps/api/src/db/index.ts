import { neon } from "@neondatabase/serverless";

import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(env.DB_URL);
export const db = drizzle({ client: sql, schema });
