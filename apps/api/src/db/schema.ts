import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";

export const todo = pgTable("todos", {
  id: serial().primaryKey(),
  task: text().notNull(),
  completed: boolean().notNull().default(false),
});
