import {
  detectFrameworkRecord,
  LocalFileSystemDetector,
} from "@vercel/fs-detectors";
import { frameworkList } from "@vercel/frameworks";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { logger } from "./utils/loggers.js";

export async function detectFramework(dest: string) {
  const fs = new LocalFileSystemDetector(dest);

  const framework = await detectFrameworkRecord({
    fs,
    frameworkList,
  });
  return framework?.slug;
}

export async function createVercelConfig({
  dest,
  detectedFramework,
}: {
  dest: string;
  detectedFramework: string;
}) {
  const projectJsonContent = {
    projectId: "deplit",
    orgId: "deplit",
    settings: {
      framework: detectedFramework,
    },
  };

  const vercelDir = path.join(dest, ".vercel");
  const projectJsonPath = path.join(vercelDir, "project.json");
  await fs.mkdir(vercelDir);
  await fs.writeFile(projectJsonPath, JSON.stringify(projectJsonContent));
}

/**
 * Runs the Vercel build process in the specified directory using the configuration at `.vercel/project.json`.
 *
 * Spawns a child process to execute the `vercel build` command, logging all output lines. Resolves when the build completes successfully.
 *
 * @param dest - The directory containing the project to build.
 * @throws {Error} If the build process exits with a nonzero code or fails to start.
 */
export function runVercelBuild(dest: string): Promise<void> {
  const vercelDir = path.join(dest, ".vercel");
  const projectJsonPath = path.join(vercelDir, "project.json");
  return new Promise((resolve, reject) => {
    const buildProcess = spawn(
      // vercel cli will be globally installed in the container
      "vercel",
      ["build", "--cwd", dest, "-A", projectJsonPath],
      { shell: true, env: { PATH: process.env.PATH } },
    );

    buildProcess.stdout.on("data", (data: Buffer) => {
      const logs = data.toString().split("\n").filter(Boolean);
      for (const line of logs) {
        logger.info(line);
      }
    });

    buildProcess.stderr.on("data", (data: Buffer) => {
      const logs = data.toString().split("\n").filter(Boolean);
      for (const line of logs) {
        logger.info(line);
      }
    });

    buildProcess.on("error", (err) => {
      logger.error(`Child process error: ${err}`);
      reject(err);
    });

    buildProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errorMessage = `Vercel build failed with exit code ${code}`;
        reject(new Error(errorMessage));
      }
    });
  });
}
