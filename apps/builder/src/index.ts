import fs from "fs/promises";
import path from "path";
import {
  createVercelConfig,
  detectFramework,
  runVercelBuild,
} from "./build.js";
import { cloneRepo } from "./git.js";
import { mapUrlToFilePath } from "./postprocess.js";
import { logger } from "./utils/loggers.js";

const cloneDest = "/home/dhruvil/Downloads/deplit/temp";
const outDir = "/home/dhruvil/Downloads/deplit/out";

const gitUrl =
  process.env.REPO_URL ?? "https://github.com/mdhruvil/mdhruvil.github.io";
const branch = process.env.BRANCH ?? "main";

async function cleanDest(dest: string) {
  try {
    await fs.rm(dest, { recursive: true, force: true });
    await fs.mkdir(dest, { recursive: true });
    logger.info(`Cleaned workspace: ${dest}`);
  } catch (err) {
    logger.warn(`Error cleaning workspace: ${err}`);
  }
}

async function main() {
  await cleanDest(cloneDest);

  logger.info(`Cloning ${gitUrl} (Branch: ${branch})`);
  await cloneRepo({ url: gitUrl, dest: cloneDest, ref: branch }).catch(
    (err) => {
      logger.error("Cloning failed.", err);
      process.exit(1);
    },
  );
  logger.info("Cloning completed.");

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
}

main();
