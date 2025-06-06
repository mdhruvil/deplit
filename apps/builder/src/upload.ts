import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { logger } from "./utils/loggers.js";
import fs from "fs/promises";
import { createReadStream } from "fs";
import mime from "mime-types";
import path from "path";
import { gitCommitSha, projectId } from "./index.js";

const accountName = "deplit";

const blobUrl =
  process.env.NODE_ENV === "development"
    ? //This used in local development with Azurite
      "https://host.docker.internal:10000/devstoreaccount1"
    : `https://${accountName}.blob.core.windows.net`;

const creds =
  process.env.NODE_ENV === "development"
    ? new StorageSharedKeyCredential(
        "devstoreaccount1",
        "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
      )
    : new DefaultAzureCredential();

const blobServiceClient = new BlobServiceClient(blobUrl, creds);

/**
 * Ensures that a blob storage container for the current project exists, creating it if necessary.
 *
 * @returns The {@link ContainerClient} for the project's container.
 */
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

/**
 * Recursively uploads all files from a local directory to an Azure Blob Storage container, organizing them under a path prefixed by the current Git commit SHA.
 *
 * Skips execution if running in a development environment.
 *
 * @param localCurrentDirPath - The path to the directory whose contents should be uploaded.
 * @param localBaseDirPath - The root directory used to compute relative paths for blob storage organization. Defaults to {@link localCurrentDirPath}.
 *
 * @throws {Error} If {@link gitCommitSha} is not defined when attempting to upload a file.
 */
export async function uploadDirRecursively({
  localCurrentDirPath,
  localBaseDirPath = localCurrentDirPath,
}: UploadDirRecursivelyArgs) {
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
      if (!gitCommitSha) {
        throw new Error("gitCommitSha is not defined");
      }
      const relativeFilePath = path.relative(localBaseDirPath, fullPath);
      const blobFilePath = path.join(gitCommitSha, relativeFilePath);
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
