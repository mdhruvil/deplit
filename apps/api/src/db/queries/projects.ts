import { and, eq } from "drizzle-orm";
import { db } from "..";
import { projects } from "../schema";
import { ProjectInsert, ProjectUpdate } from "../validators";

export class DBProjects {
  static async create(userId: string, data: ProjectInsert) {
    const result = await db
      .insert(projects)
      .values({
        ...data,
        creatorId: userId,
      })
      .returning();
    return result;
  }

  static async findById(id: string) {
    const result = await db.query.projects.findFirst({
      where: (project, { eq }) => eq(project.id, id),
      with: {
        creator: true,
      },
    });
    return result;
  }

  static async findBySlug(slug: string) {
    const result = await db.query.projects.findFirst({
      where: (project, { eq }) => eq(project.slug, slug),
    });
    return result;
  }

  static async findAll(userId: string) {
    const result = await db.query.projects.findMany({
      where: (project, { eq }) => eq(project.creatorId, userId),
    });
    return result;
  }

  static async update(projectId: string, userId: string, data: ProjectUpdate) {
    const result = await db
      .update(projects)
      .set({
        ...data,
      })
      .where(and(eq(projects.id, projectId), eq(projects.creatorId, userId)))
      .returning();
    return result;
  }

  static async delete(projectId: string, userId: string) {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.creatorId, userId)));
    return result;
  }
}
