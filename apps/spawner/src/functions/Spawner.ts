import { app, InvocationContext } from "@azure/functions";

export async function Spawner(
  queueItem: unknown,
  context: InvocationContext,
): Promise<void> {}

app.storageQueue("Spawner", {
  queueName: "js-queue-items",
  connection: "AzureWebJobsStorage",
  handler: Spawner,
});
