import {
  ContainerAppsAPIClient,
  JobExecutionTemplate,
} from "@azure/arm-appcontainers";
import { app, InvocationContext } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * needed values to spwan a new build container
 * - github url
 * - branch
 * - project slug
 */

const testCreate: QueueItem = {
  githubUrl: "https://github.com/mdhruvil/deplit-zaggonaut.git",
  branch: "main",
  projectSlug: "ztest",
};

type QueueItem = {
  githubUrl: string;
  branch: string;
  projectSlug: string;
};

export async function Spawner(
  queueItem: QueueItem,
  context: InvocationContext,
): Promise<void> {
  console.log("Queue item:", queueItem);
  const item = queueItem;

  if (!item.githubUrl || !item.branch || !item.projectSlug) {
    throw new Error(
      "Missing required properties: githubUrl, branch, or projectSlug",
    );
  }
  const { APPCONTAINERS_SUBSCRIPTION_ID, APPCONTAINERS_RESOURCE_GROUP } =
    process.env;
  if (!APPCONTAINERS_SUBSCRIPTION_ID || !APPCONTAINERS_RESOURCE_GROUP) {
    throw new Error(
      "Missing required environment variables: APPCONTAINERS_SUBSCRIPTION_ID or APPCONTAINERS_RESOURCE_GROUP",
    );
  }
  const credential = new DefaultAzureCredential();
  const containerAppsClient = new ContainerAppsAPIClient(
    credential,
    APPCONTAINERS_SUBSCRIPTION_ID,
  );

  const token = crypto.randomUUID();

  const builderEnv = {
    REPO_URL: item.githubUrl,
    BRANCH: item.branch,
    PROJECT_ID: item.projectSlug,
    INTERNAL_SIDECAR_TOKEN: token,
    SIDECAR_PORT: "9090",
  };

  const sidecarEnv = {
    INTERNAL_API_TOKEN: token,
  };

  const template: JobExecutionTemplate = {
    containers: [
      {
        name: "deplit-builder",
        image: "ghcr.io/mdhruvil/deplit-builder:latest",
        resources: {
          cpu: 3,
          memory: "6Gi",
        },
        env: Object.entries(builderEnv).map(([name, value]) => ({
          name,
          value,
        })),
      },
      {
        name: "deplit-sidecar",
        image: "ghcr.io/mdhruvil/deplit-sidecar:latest",
        resources: {
          cpu: 1,
          memory: "2Gi",
        },
        env: Object.entries(sidecarEnv).map(([name, value]) => ({
          name,
          value,
        })),
      },
    ],
  };

  console.log(JSON.stringify(template, null, 2));

  const jobName = "deplit-builder-job";

  const result = await containerAppsClient.jobs.beginStartAndWait(
    APPCONTAINERS_RESOURCE_GROUP,
    jobName,
    { template },
  );
  console.log(result);
}

app.storageQueue("Spawner", {
  queueName: "deplit-deployment-queue",
  connection: "AzureWebJobsStorage",
  handler: Spawner,
});
