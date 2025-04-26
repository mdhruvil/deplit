import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const todo = pgTable("todos", {
  id: serial().primaryKey(),
  task: text().notNull(),
  completed: boolean().notNull().default(false),
});

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  projects: many(projects),
}));

export const projects = pgTable("projects", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v4()`)
    .notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  githubUrl: text("github_url").notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  envVars: json("env_vars").$type<Record<string, string>>(),
  ...timestamps,
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  creator: one(user, { fields: [projects.creatorId], references: [user.id] }),
  deployments: many(deployments),
}));

export const deployments = pgTable("deployments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v4()`)
    .notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  gitCommitHash: text("git_commit_hash").notNull(),
  gitRef: text("git_ref").notNull(),
  gitCommitMessage: text("git_commit_message").notNull(),
  gitCommitAuthorName: text("git_commit_author_name").notNull(),
  framework: text("framework").notNull(),
  buildStatus: text("build_status", {
    enum: ["IN_QUEUE", "BUILDING", "SUCCESS", "FAILED"],
  })
    .notNull()
    .default("IN_QUEUE"),
  buildDurationMs: integer("build_duration_ms").default(0),
  target: text("target", { enum: ["PRODUCTION", "PREVIEW"] }).notNull(),
  /**
   * `activeState` is used to determine if the production deployment is active or not.
   * If the deployment is active, it means that the deployment is live and is being served to the users.
   * `activeState` will be `NA` for preview deployments.
   */
  activeState: text("activeState", {
    enum: ["ACTIVE", "INACTIVE", "NA"],
  }).notNull(),
  /**
   * alias of the deployment
   * For
   * - production deployment: alias = <project-slug>.deplit.live
   * - preview deployment: alias = <project-slug>-<git-commit-short-sha>.deplit.live
   */
  alias: text("alias").notNull(),
  /**
   * metadata of the deployment like
   * - htmlRoutes
   * - assetRoutes
   * - sizes of the deployment
   * - isSpa
   * - notFoundRoute
   *
   */
  metadata: json("metadata"),
});

export const deploymentRelations = relations(deployments, ({ one }) => ({
  project: one(projects, {
    fields: [deployments.projectId],
    references: [projects.id],
  }),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
