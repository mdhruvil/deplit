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

export function runVercelBuild(dest: string): Promise<void> {
  const vercelDir = path.join(dest, ".vercel");
  const projectJsonPath = path.join(vercelDir, "project.json");
  return new Promise((resolve, reject) => {
    const buildProcess = spawn(
      "npx",
      ["--yes", "vercel", "build", "--cwd", dest, "-A", projectJsonPath],
      { shell: true },
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
