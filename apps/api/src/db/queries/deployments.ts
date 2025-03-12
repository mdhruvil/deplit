import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { deployments } from "../schema.js";
import { DeploymentInsert, DeploymentUpdate } from "../validators.js";

export class DBDeployments {
  static async create(projectId: string, data: DeploymentInsert) {
    const result = await db.insert(deployments).values({
      ...data,
      projectId,
    });
    return result;
  }

  static async findById(id: string, projectId: string) {
    const result = await db.query.deployments.findFirst({
      where: (deployment, { eq, and }) =>
        and(eq(deployment.id, id), eq(deployment.projectId, projectId)),
      with: {
        project: true,
      },
    });
    return result;
  }

  static async findAll(projectId: string) {
    const result = await db.query.deployments.findMany({
      where: (deployment, { eq }) => eq(deployment.projectId, projectId),
    });
    return result;
  }

  static async update(id: string, data: DeploymentUpdate) {
    const result = await db
      .update(deployments)
      .set({
        ...data,
      })
      .where(eq(deployments.id, id));
    return result;
  }

  static async delete(id: string) {
    const result = await db.delete(deployments).where(eq(deployments.id, id));
    return result;
  }
}
