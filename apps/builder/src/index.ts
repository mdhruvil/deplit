import path from "path";
import {
  createVercelConfig,
  detectFramework,
  runVercelBuild,
} from "./build.js";
import { cloneRepo } from "./git.js";
import { mapUrlToFilePath } from "./postprocess.js";
import { logger } from "./utils/loggers.js";

// const DESTINATION = "/home/dhruvil/Downloads/deplit/temp-" + Date.now();
const DESTINATION = "/home/dhruvil/Dhruvil/code/deplit-tests/ts-router-spa";
const gitUrl = "https://github.com/mdhruvil/mdhruvil.github.io";
const branch = "main";

async function main() {
  // logger.info(`Cloning ${gitUrl} (Branch: ${branch})`);
  // await cloneRepo({ url: gitUrl, dest: DESTINATION, ref: branch }).catch(
  //   (err) => {
  //     logger.error("Cloning failed.", err);
  //     process.exit(1);
  //   },
  // );

  // logger.info("Cloning completed.");

  const framework = await detectFramework(DESTINATION);
  if (!framework) {
    logger.error("Failed to detect framework.", framework);
    process.exit(1);
  }
  logger.info(`Detected framework: ${framework}`);

  await createVercelConfig({
    dest: DESTINATION,
    detectedFramework: framework,
  }).catch((err) => {
    logger.error("Failed to create vercel config.", err);
    process.exit(1);
  });
  logger.info("Vercel config created.");

  logger.info("Running : vercel build");

  await runVercelBuild(DESTINATION).catch((err) => {
    logger.error("Vercel build failed.", err);
    process.exit(1);
  });

  const vercelStaticOutputDir = path.join(
    DESTINATION,
    ".vercel",
    "output",
    "static",
  );
  logger.info(`Postprocessing vercel output from ${vercelStaticOutputDir}`);
  const { htmlRoutes, assetsRoutes } = await mapUrlToFilePath(
    vercelStaticOutputDir,
  );

  console.table(htmlRoutes);
  console.table(assetsRoutes);
}

main();
