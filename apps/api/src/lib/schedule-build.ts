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

  const message = {
    githubUrl: args.githubUrl,
    branch: args.gitRef,
    projectId: args.projectId,
    deploymentId: deployment[0].id,
    gitCommitSha: args.gitCommitHash,
  };

  const jsonString = JSON.stringify(message);
  const base64Message = Buffer.from(jsonString).toString("base64");

  const xmlBody = `<QueueMessage><MessageText>${base64Message}</MessageText></QueueMessage>`;

  const response = await fetch(env.AZURE_STORAGE_QUEUE_SAS_URL, {
    method: "POST",
    headers: {
      "x-ms-date": new Date().toUTCString(),
      "x-ms-version": "2020-10-02",
      "Content-Type": "application/xml",
      "Content-Length": String(xmlBody.length),
    },
    body: xmlBody,
  });

  if (!response.ok) {
    console.log(await response.text());
    throw new Error(
      `Failed to schedule deployment: ${response.status} ${response.statusText}`,
    );
  }

  const responseBody = await response.text();
  console.log("Response from Azure:", responseBody);
  return true;
}
