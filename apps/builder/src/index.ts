import fs from "fs/promises";
import path from "path";
import {
  createVercelConfig,
  detectFramework,
  runVercelBuild,
} from "./build.js";
import { cloneRepo, getLatestCommitObjectId } from "./git.js";
import { mapUrlToFilePath } from "./postprocess.js";
import { logger } from "./utils/loggers.js";
import { uploadDirRecursively } from "./upload.js";
import { Sidecar } from "./utils/sidecar.js";

const cloneDest = process.env.WORK_DIR;
const outDir = process.env.OUTPUT_DIR;
const gitUrl = process.env.REPO_URL;
const branch = process.env.BRANCH;
export const projectId = process.env.PROJECT_ID!;
const logFileDest = process.env.LOG_FILE_DEST;

export let latestCommitObjectId: string | undefined;

async function cleanDest(dest: string) {
  try {
    await fs.rm(dest, { recursive: true, force: true });
    await fs.mkdir(dest, { recursive: true });
  } catch (err) {
    logger.warn(`Error cleaning directory: ${err}`);
  }
}

/**
 * Orchestrates the complete build automation workflow.
 *
 * This asynchronous function validates the required environment variables, cleans the destination directories, clones the Git repository, retrieves the latest commit, detects the project framework, creates a Vercel configuration, runs the Vercel build, copies the static output, maps URL routes to file paths, and finally uploads the output to Azure Blob Storage.
 *
 * Each step is critical and will throw an Error with a corresponding message and cause if it fails.
 *
 * @throws {Error} If any required environment variable is missing.
 * @throws {Error} If cloning the repository fails.
 * @throws {Error} If retrieving the latest commit object ID fails.
 * @throws {Error} If framework detection fails.
 * @throws {Error} If creating the Vercel configuration fails.
 * @throws {Error} If the Vercel build process fails.
 * @throws {Error} If copying the Vercel output fails.
 * @throws {Error} If uploading files to Azure Blob Storage fails.
 */
async function main() {
  // TODO: should we use zod here?
  if (
    !cloneDest ||
    !outDir ||
    !gitUrl ||
    !branch ||
    !projectId ||
    !logFileDest
  ) {
    throw new Error(
      "Missing environment variable(s). Check the .env.example file.",
    );
  }

  await cleanDest(cloneDest);
  await cleanDest(outDir);

  logger.info(`Cloning ${gitUrl} (Branch: ${branch})`);
  await cloneRepo({ url: gitUrl, dest: cloneDest, ref: branch }).catch(
    (err) => {
      throw new Error("Failed to clone repo.", { cause: err });
    },
  );
  logger.info("Cloning completed.");

  latestCommitObjectId = await getLatestCommitObjectId({
    dest: cloneDest,
    ref: branch,
  }).catch((err) => {
    throw new Error("Failed to get latest commit object id.", { cause: err });
  });

  const framework = await detectFramework(cloneDest);
  if (!framework) {
    throw new Error("Failed to detect framework.", { cause: framework });
  }
  logger.info(`Detected framework: ${framework}`);

  await createVercelConfig({
    dest: cloneDest,
    detectedFramework: framework,
  }).catch((err) => {
    throw new Error("Failed to create vercel config.", { cause: err });
  });
  logger.info("Vercel config created.");

  logger.info("Running: vercel build");
  await runVercelBuild(cloneDest).catch((err) => {
    throw new Error("Vercel build failed.", { cause: err });
  });

  const vercelStaticOutputDir = path.join(
    cloneDest,
    ".vercel",
    "output",
    "static",
  );
  await fs
    .cp(vercelStaticOutputDir, outDir, { recursive: true })
    .catch((err) => {
      throw new Error("Failed to copy vercel output.", { cause: err });
    });

  logger.info(`Postprocessing vercel output from ${outDir}`);
  const { htmlRoutes, assetsRoutes } = await mapUrlToFilePath(outDir);

  console.table(htmlRoutes);
  console.table(assetsRoutes);

  logger.local("Uploading files to Azure Blob Storage...");
  await uploadDirRecursively({
    localCurrentDirPath: outDir,
  }).catch((err) => {
    throw new Error("Failed to upload files to Azure Blob Storage.", {
      cause: err,
    });
  });
}

const sidecarPort = process.env.SIDECAR_PORT;
const sidecarToken = process.env.INTERNAL_SIDECAR_TOKEN;

if (!sidecarPort || !sidecarToken) {
  logger.error("Missing environment variable(s). Check the .env.example file.");
  process.exit(1);
}

const sidecar = new Sidecar(sidecarPort, sidecarToken);

main()
  .then(async () => {
    logger.info("Build completed successfully.");
    await sidecar.updateBuildStatus("SUCCESS", "Build completed successfully.");
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error("Error: ", err);
    await sidecar.updateBuildStatus(
      "ERROR",
      err.message ?? "Build failed for some unknown reason.",
    );
    process.exit(1);
  });
