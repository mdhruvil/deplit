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

const cloneDest = process.env.DEPLIT_WORK_DIR!;
const outDir = process.env.DEPLIT_OUTPUT_DIR!;
const gitUrl = process.env.DEPLIT_REPO_URL!;
const branch = process.env.DEPLIT_BRANCH!;
export const projectSlug = process.env.DEPLIT_PROJECT_SLUG!;
const logFileDest = process.env.DEPLIT_LOG_FILE_DEST!;

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
  const missingEnvVars = [];
  // TODO: should we use zod here?
  if (!cloneDest) missingEnvVars.push("DEPLIT_WORK_DIR");
  if (!outDir) missingEnvVars.push("DEPLIT_OUTPUT_DIR");
  if (!gitUrl) missingEnvVars.push("DEPLIT_REPO_URL");
  if (!branch) missingEnvVars.push("DEPLIT_BRANCH");
  if (!projectSlug) missingEnvVars.push("DEPLIT_PROJECT_SLUG");
  if (!logFileDest) missingEnvVars.push("DEPLIT_LOG_FILE_DEST");
  if (!process.env.DEPLIT_INTERNAL_SIDECAR_TOKEN)
    missingEnvVars.push("DEPLIT_INTERNAL_SIDECAR_TOKEN");
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missingEnvVars.join(", ")}`,
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

const sidecarPort = process.env.DEPLIT_SIDECAR_PORT;
const sidecarToken = process.env.DEPLIT_INTERNAL_SIDECAR_TOKEN;

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
