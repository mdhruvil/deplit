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
    logger.error(
      "Missing environment variable(s). Check the .env.example file.",
    );
    process.exit(1);
  }

  await cleanDest(cloneDest);
  await cleanDest(outDir);

  logger.info(`Cloning ${gitUrl} (Branch: ${branch})`);
  await cloneRepo({ url: gitUrl, dest: cloneDest, ref: branch }).catch(
    (err) => {
      logger.error("Cloning failed.", err);
      process.exit(1);
    },
  );
  logger.info("Cloning completed.");

  latestCommitObjectId = await getLatestCommitObjectId({
    dest: cloneDest,
    ref: branch,
  }).catch((err) => {
    logger.error("Failed to get latest commit object id.", err);
    process.exit(1);
  });

  const framework = await detectFramework(cloneDest);
  if (!framework) {
    logger.error("Failed to detect framework.", framework);
    process.exit(1);
  }
  logger.info(`Detected framework: ${framework}`);

  await createVercelConfig({
    dest: cloneDest,
    detectedFramework: framework,
  }).catch((err) => {
    logger.error("Failed to create vercel config.", err);
    process.exit(1);
  });
  logger.info("Vercel config created.");

  logger.info("Running: vercel build");
  await runVercelBuild(cloneDest).catch((err) => {
    logger.error("Vercel build failed.", err);
    process.exit(1);
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
      logger.error("Failed to copy vercel output.", err);
      process.exit(1);
    });

  logger.info(`Postprocessing vercel output from ${outDir}`);
  const { htmlRoutes, assetsRoutes } = await mapUrlToFilePath(outDir);

  console.table(htmlRoutes);
  console.table(assetsRoutes);

  logger.local("Uploading files to Azure Blob Storage...");
  await uploadDirRecursively({
    localCurrentDirPath: outDir,
  }).catch((err) => {
    logger.local("Failed to upload files to Azure Blob Storage.", err);
    process.exit(1);
  });
}

main();
