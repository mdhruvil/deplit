import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  projects: many(projects),
}));

export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())
    .notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  framework: text("framework"),
  isSPA: integer("is_spa", { mode: "boolean" }).notNull().default(false),
  githubUrl: text("github_url").notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  creator: one(user, { fields: [projects.creatorId], references: [user.id] }),
  deployments: many(deployments),
}));

export const deployments = sqliteTable("deployments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())
    .notNull(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  gitCommitHash: text("git_commit_hash").notNull(),
  gitRef: text("git_ref").notNull(),
  gitCommitMessage: text("git_commit_message").notNull(),
  gitCommitAuthorName: text("git_commit_author_name").notNull(),
  gitCommitTimestamp: integer("git_commit_timestamp", {
    mode: "timestamp",
  }).notNull(),
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
   * - production deployment: alias = [project-slug].deplit.live
   * - preview deployment: alias = [project-slug]-[git-commit-short-sha].deplit.live
   */
  alias: text("alias").notNull(),
  /**
   * metadata of the deployment like
   * - htmlRoutes
   * - assetRoutes
   * - size of the deployment
   * - isSPA
   * - not found route
   * TODO: decide the format of the metadata
   */
  metadata: text("metadata", { mode: "json" }),

  ...timestamps,
});

export const deploymentRelations = relations(deployments, ({ one }) => ({
  project: one(projects, {
    fields: [deployments.projectId],
    references: [projects.id],
  }),
}));

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
