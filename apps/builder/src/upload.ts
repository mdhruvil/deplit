import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { logger } from "./utils/loggers.js";
import fs from "fs/promises";
import { createReadStream } from "fs";
import mime from "mime-types";
import path from "path";
import { latestCommitObjectId, projectId } from "./index.js";

const accountName = "deplit";

const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential(),
);

async function createContainerIfNotExists() {
  const containerClient = blobServiceClient.getContainerClient(projectId);
  const exists = await containerClient.exists();
  if (!exists) {
    logger.local(`Container ${projectId} does not exist, creating...`);
    await containerClient.create({
      access: "blob",
    });
    logger.local(`Container ${projectId} created.`);
  }
  return containerClient;
}

type UploadDirRecursivelyArgs = {
  localCurrentDirPath: string;
  localBaseDirPath?: string;
};

let globalContainerClient: ContainerClient;

export async function uploadDirRecursively({
  localCurrentDirPath,
  localBaseDirPath = localCurrentDirPath,
}: UploadDirRecursivelyArgs) {
  if (process.env.NODE_ENV === "development") {
    logger.local("Skipping upload in test mode");
    return;
  }
  const containerClient =
    globalContainerClient ??
    (globalContainerClient = await createContainerIfNotExists());
  const items = await fs.readdir(localCurrentDirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(localCurrentDirPath, item.name);

    if (item.isDirectory()) {
      await uploadDirRecursively({
        localBaseDirPath,
        localCurrentDirPath: fullPath,
      });
    } else if (item.isFile()) {
      if (!latestCommitObjectId) {
        throw new Error("latestCommitObjectId is not defined");
      }
      const relativeFilePath = path.relative(localBaseDirPath, fullPath);
      const blobFilePath = path.join(latestCommitObjectId, relativeFilePath);
      await uploadFile({
        containerClient,
        localFilePath: fullPath,
        blobFilePath,
      });
    }
  }
}

type UploadFileOptions = {
  containerClient: ContainerClient;
  localFilePath: string;
  blobFilePath: string;
};

async function uploadFile({
  containerClient,
  localFilePath,
  blobFilePath,
}: UploadFileOptions) {
  const blobClient = containerClient.getBlockBlobClient(blobFilePath);

  const fileReadableStream = createReadStream(localFilePath);

  const mimeType = mime.lookup(localFilePath);

  try {
    await blobClient.uploadStream(fileReadableStream, 8 * 1024 * 1024, 10, {
      blobHTTPHeaders: {
        blobContentType: mimeType ? mimeType : "application/octet-stream",
      },
    });
    logger.local(`Uploaded file ${localFilePath} to ${blobFilePath}`);
  } catch (error) {
    logger.local(`Failed to upload file ${localFilePath} to ${blobFilePath}`);
    throw error;
  } finally {
    fileReadableStream.destroy();
  }
}
