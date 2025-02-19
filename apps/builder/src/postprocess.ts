import { readdir } from "fs/promises";
import path from "path";

/**
 * Converts a file’s relative path into a URL route.
 *
 * Rules:
 * - If the file is an HTML file named `index.html`, the route is its folder (or "/" for root).
 * - If the file is an HTML file but not "index", its extension is dropped.
 * - For other file types (css, js, txt, etc.) the full relative path (with extension) is used.
 *
 * @param relativePath - The file path relative to the base directory (using POSIX separators).
 * @returns The URL route.
 */
function getRoute(relativePath: string): string {
  const parsed = path.parse(relativePath);
  const ext = parsed.ext.toLowerCase();
  const name = parsed.name.toLowerCase();

  if (ext === ".html" && name === "index") {
    return parsed.dir ? `/${parsed.dir}` : "/";
  }

  if (ext === ".html") {
    return parsed.dir ? `/${parsed.dir}/${parsed.name}` : `/${parsed.name}`;
  }

  return `/${relativePath}`;
}

/**
 * Recursively reads a directory and returns an object mapping URL routes to file paths
 * relative to the base directory.
 *
 * @param currentDir - The current directory to scan.
 * @param baseDir - The base directory from which relative paths are computed (defaults to currentDir).
 * @returns A promise resolving to an object where keys are URL routes and values are relative file paths.
 */
export async function mapUrlToFilePath(
  currentDir: string,
  baseDir: string = currentDir,
): Promise<{
  htmlRoutes: Record<string, string>;
  assetsRoutes: Record<string, string>;
}> {
  const htmlRoutes: Record<string, string> = {};
  const assetsRoutes: Record<string, string> = {};
  const items = await readdir(currentDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(currentDir, item.name);

    if (item.isDirectory()) {
      const { htmlRoutes: nestedHtmlRoutes, assetsRoutes: nestedAssetsRoutes } =
        await mapUrlToFilePath(fullPath, baseDir);

      Object.assign(htmlRoutes, nestedHtmlRoutes);
      Object.assign(assetsRoutes, nestedAssetsRoutes);
    } else if (item.isFile()) {
      const relativeFilePath = path.relative(baseDir, fullPath);
      const route = getRoute(relativeFilePath);

      if (
        relativeFilePath.endsWith(".html") ||
        relativeFilePath.endsWith(".htm")
      ) {
        htmlRoutes[route] = relativeFilePath;
      } else {
        assetsRoutes[route] = relativeFilePath;
      }
    }
  }

  return { htmlRoutes, assetsRoutes };
}
