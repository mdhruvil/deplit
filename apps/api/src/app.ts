import { Hono } from "hono";
import { db } from "./db/index.js";
import { todo } from "./db/schema.js";
import { auth } from "./lib/auth.js";

export const app = new Hono({ strict: false })
  .basePath("/api")
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .get("/todo", async (c) => {
    const todos = await db.query.todo.findMany();
    return c.json({ message: "OK!", todos });
  })
  .post("/todo", async (c) => {
    const { title } = await c.req.json();
    if (!title || typeof title !== "string") {
      return c.json({ error: "Invalid title" }, 400);
    }
    const returnedTodo = await db
      .insert(todo)
      .values({ task: title })
      .returning();
    return c.json({ message: "OK!", todo: returnedTodo });
  });
