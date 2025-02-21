import { Hono } from "hono";
import { db } from "./db/index.js";
import { todos } from "./db/schema.js";

export const app = new Hono({ strict: false })
  .get("/todo", async (c) => {
    const todos = await db.query.todos.findMany();
    return c.json({ message: "OK!", todos });
  })
  .post("/todo", async (c) => {
    const { title } = await c.req.json();
    if (!title || typeof title !== "string") {
      return c.json({ error: "Invalid title" }, 400);
    }
    const todo = await db.insert(todos).values({ title }).returning();
    return c.json({ message: "OK!", todo });
  });
