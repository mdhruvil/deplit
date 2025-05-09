import fs from "fs/promises";
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
 * Recursively scans a directory tree and maps URL routes to relative file paths for HTML and asset files.
 *
 * @param currentDir - Directory to begin scanning.
 * @param baseDir - Directory from which relative paths are calculated. Defaults to {@link currentDir}.
 * @returns A promise resolving to an object with `htmlRoutes` and `assetsRoutes`, each mapping URL routes to relative file paths.
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
  const items = await fs.readdir(currentDir, { withFileTypes: true });

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

export type RouteMetadata = {
  route: string;
  path: string;
  size: number;
};

/**
 * Generates metadata for each route, including file path and size.
 *
 * For each route-file pair, retrieves the file size and returns an array of metadata objects.
 *
 * @param routes - Mapping of route strings to relative file paths.
 * @param baseDir - Base directory used to resolve file paths.
 * @returns A promise that resolves to an array of {@link RouteMetadata} objects for each route.
 */
export async function prepareMetadataForRoutes(
  routes: Record<string, string>,
  baseDir: string,
): Promise<RouteMetadata[]> {
  const promises = Object.entries(routes).map(async ([route, filePath]) => {
    const fullPath = path.join(baseDir, filePath);
    const stats = await fs.stat(fullPath);
    const size = stats.size;
    return {
      route,
      path: filePath,
      size,
    };
  });

  const metadata = await Promise.all(promises);
  return metadata;
}
