import { QueueClient } from "@azure/storage-queue";
import { DBDeployments } from "../db/queries/deployments";
import { env } from "cloudflare:workers";

export async function createDeploymentAndScheduleIt(args: {
  projectId: string;
  githubUrl: string;
  gitCommitHash: string;
  gitRef: string;
  gitCommitMessage: string;
  gitCommitAuthorName: string;
  gitCommitTimestamp: Date;
  alias: string;
  target: "PRODUCTION" | "PREVIEW";
}) {
  const isProduction = args.target === "PRODUCTION";
  const deployment = await DBDeployments.create(args.projectId, {
    gitCommitHash: args.gitCommitHash,
    gitRef: args.gitRef,
    gitCommitMessage: args.gitCommitMessage,
    gitCommitAuthorName: args.gitCommitAuthorName,
    gitCommitTimestamp: args.gitCommitTimestamp,
    alias: args.alias,
    activeState: isProduction ? "INACTIVE" : "NA",
    target: args.target,
  });

  if (!deployment || deployment.length === 0) {
    throw new Error("Failed to create deployment");
  }

  const queueClient = new QueueClient(
    env.AZURE_STORAGE_CONNECTION_STRING,
    "deplit-deployment-queue",
  );

  const message = {
    githubUrl: args.githubUrl,
    branch: args.gitRef,
    projectId: args.projectId,
    deploymentId: deployment[0].id,
    gitCommitSha: args.gitCommitHash,
  };

  const jsonString = JSON.stringify(message);
  const base64Message = Buffer.from(jsonString).toString("base64");

  const queueResponse = await queueClient.sendMessage(base64Message);
  return queueResponse;
}
