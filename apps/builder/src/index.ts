import fs from "fs/promises";
import path from "path";
import {
  createVercelConfig,
  detectFramework,
  runVercelBuild,
} from "./build.js";
import { cloneRepo } from "./git.js";
import { mapUrlToFilePath, prepareMetadataForRoutes } from "./postprocess.js";
import { logger, makeTable } from "./utils/loggers.js";
import { uploadDirRecursively } from "./upload.js";
import { Sidecar } from "./utils/sidecar.js";

const cloneDest = process.env.DEPLIT_WORK_DIR!;
const outDir = process.env.DEPLIT_OUTPUT_DIR!;
const gitUrl = process.env.DEPLIT_REPO_URL!;
const branch = process.env.DEPLIT_BRANCH!;
const deploymentId = process.env.DEPLIT_DEPLOYMENT_ID!;
export const gitCommitSha = process.env.DEPLIT_GIT_COMMIT_SHA!;
export const projectId = process.env.DEPLIT_PROJECT_ID!;

const logFileDest = process.env.DEPLIT_LOG_FILE_DEST!;
const sidecarPort = process.env.DEPLIT_SIDECAR_PORT!;
const sidecarToken = process.env.DEPLIT_INTERNAL_SIDECAR_TOKEN!;

/**
 * Removes the specified directory and recreates it as an empty directory.
 *
 * Logs a warning if the directory cannot be cleaned or recreated.
 *
 * @param dest - The path to the directory to clean and recreate.
 */
async function cleanDest(dest: string) {
  try {
    await fs.rm(dest, { recursive: true, force: true });
    await fs.mkdir(dest, { recursive: true });
  } catch (err) {
    logger.warn(`Error cleaning directory: ${err}`);
  }
}

const sidecar = new Sidecar(sidecarPort, sidecarToken);

/**
 * Orchestrates the end-to-end process of cloning a Git repository, building it with Vercel, deploying the output to Azure Blob Storage, and updating deployment metadata via a sidecar service.
 *
 * @throws {Error} If any required environment variable is missing, or if cloning, framework detection, configuration, build, file copying, uploading, or metadata preparation fails.
 */
async function main() {
  const missingEnvVars = [];
  // TODO: should we use zod here?
  if (!cloneDest) missingEnvVars.push("DEPLIT_WORK_DIR");
  if (!outDir) missingEnvVars.push("DEPLIT_OUTPUT_DIR");
  if (!gitUrl) missingEnvVars.push("DEPLIT_REPO_URL");
  if (!branch) missingEnvVars.push("DEPLIT_BRANCH");
  if (!gitCommitSha) missingEnvVars.push("DEPLIT_GIT_COMMIT_SHA");
  if (!projectId) missingEnvVars.push("DEPLIT_PROJECT_ID");
  if (!deploymentId) missingEnvVars.push("DEPLIT_DEPLOYMENT_ID");
  if (!logFileDest) missingEnvVars.push("DEPLIT_LOG_FILE_DEST");
  if (!sidecarPort) missingEnvVars.push("DEPLIT_SIDECAR_PORT");
  if (!sidecarToken) missingEnvVars.push("DEPLIT_INTERNAL_SIDECAR_TOKEN");
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missingEnvVars.join(", ")}`,
    );
  }

  await sidecar.waitForSidecarHealth();

  await cleanDest(cloneDest);
  await cleanDest(outDir);

  await sidecar.updateBuildStatus("BUILDING", "Build started.");

  const buildStartTime = performance.now();

  logger.info("Getting project details...");
  const { project, githubAccessToken } = await sidecar.getProjectDetails();
  const projectDetails = {
    id: project.id,
    Name: project.fullName,
    "Is SPA?": project.isSPA ? "Yes" : "No",
    "GitHub URL": project.githubUrl,
  };

  logger.info("Project details:");
  logger.info(makeTable(projectDetails));

  logger.info(`Cloning ${gitUrl} (Branch: ${branch})`);
  await cloneRepo({
    url: gitUrl,
    dest: cloneDest,
    ref: branch,
    commitSha: gitCommitSha,
    githubAccessToken,
  }).catch((err) => {
    throw new Error("Failed to clone repo.", { cause: err });
  });
  logger.info("Cloning completed.");

  const framework = await detectFramework(cloneDest);
  logger.info(`Detected framework: ${framework ?? "unknown"}`);

  await createVercelConfig({
    dest: cloneDest,
    detectedFramework: framework ?? null,
  }).catch((err) => {
    throw new Error("Failed to create vercel config.", { cause: err });
  });
  logger.info("Vercel config created.");

  // TODO: support env vars
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

  logger.info("Deploying site...");
  await uploadDirRecursively({
    localCurrentDirPath: outDir,
  }).catch((err) => {
    throw new Error("Failed to upload files to Azure Blob Storage.", {
      cause: err,
    });
  });
  logger.info("Site deployed.");

  logger.info("Assigning domain...");
  const { htmlRoutes, assetsRoutes } = await mapUrlToFilePath(outDir);
  const htmlRoutesMetadata = await prepareMetadataForRoutes(htmlRoutes, outDir);
  const assetsRoutesMetadata = await prepareMetadataForRoutes(
    assetsRoutes,
    outDir,
  );
  logger.info("Domain assigned.");

  const buildDurationMs = performance.now() - buildStartTime;

  await sidecar.updateMetadata({
    htmlRoutes: htmlRoutesMetadata,
    assetsRoutes: assetsRoutesMetadata,
    buildDurationMs,
  });
}

main()
  .then(async () => {
    logger.info("Build completed successfully.");
    await sidecar.updateBuildStatus("SUCCESS", "Build completed successfully.");
  })
  .catch(async (err) => {
    logger.error("Error: ", err);
    await sidecar.updateBuildStatus(
      "ERROR",
      err.message ?? "Build failed for some unknown reason.",
    );
  })
  .finally(async () => {
    logger.info("Cleaning up...");
    await sidecar.exitSidecar();
    process.exit(0);
  });
