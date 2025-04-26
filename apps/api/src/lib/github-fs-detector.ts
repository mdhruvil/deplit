import { Octokit } from "@octokit/rest";
import { DetectorFilesystem } from "@vercel/fs-detectors";
import { DetectorFilesystemStat } from "@vercel/fs-detectors/dist/detectors/filesystem.js";
import { RequestError } from "octokit";
import { posix as posixPath } from "path";

export class GithubFileSystemDetector extends DetectorFilesystem {
  private owner: string;
  private repo: string;
  private ref: string;
  private apiToken?: string;

  private currentPath: string;
  private octokit: Octokit;

  constructor(config: {
    owner: string;
    repo: string;
    ref?: string;
    initialPath: string;
    apiToken?: string;
  }) {
    super();
    this.owner = config.owner;
    this.repo = config.repo;
    this.ref = config.ref ?? "main";
    this.currentPath = config.initialPath === "." ? "/" : config.initialPath;

    this.apiToken = config.apiToken;
    this.octokit = new Octokit({
      auth: config.apiToken,
    });
  }

  /**
   * Helper to construct the full path relative to the repo root for API calls.
   */
  private getRepoPath(relativePath: string): string {
    const joinedPath = posixPath.join(this.currentPath, relativePath);
    // Normalize: remove leading/trailing slashes for API calls, handle root.
    // Octokit's `getContent` needs an empty string for the root path.
    return joinedPath === "/"
      ? ""
      : joinedPath.replace(/^\//, "").replace(/\/$/, "");
  }

  private isOctokitNotFoundError(error: unknown): error is RequestError {
    return error instanceof RequestError && error.status === 404;
  }

  protected async _hasPath(name: string): Promise<boolean> {
    const repoPath = this.getRepoPath(name);
    try {
      await this.octokit.request("HEAD /repos/{owner}/{repo}/contents/{path}", {
        owner: this.owner,
        repo: this.repo,
        path: repoPath,
        ref: this.ref,
      });

      return true;
    } catch (error: unknown) {
      if (this.isOctokitNotFoundError(error)) {
        return false;
      }

      console.error(
        `_hasPath check failed for repo path "${repoPath}":`,
        error,
      );
      throw error;
    }
  }

  protected async _readFile(name: string): Promise<Buffer> {
    const repoPath = this.getRepoPath(name);
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: repoPath,
        ref: this.ref,
      });

      // Check if the response is for a file and has content
      // Octokit's types help here. If it's a directory, response.data will be an array.
      if (Array.isArray(data)) {
        throw new Error(
          `Path is a directory, not a file: ${name} (repo path: ${repoPath})`,
        );
      }
      // If it's not an array, it should be a file/symlink/submodule object.
      if (data.type !== "file") {
        throw new Error(
          `Path is not a file (type: ${data.type}): ${name} (repo path: ${repoPath})`,
        );
      }
      if (!("content" in data) || data.encoding !== "base64") {
        // This case handles potential large files where content isn't returned, or unexpected encoding.
        // For large files, you'd need the Git Blobs API (octokit.git.getBlob).
        throw new Error(
          `File content not available or not base64 encoded (size: ${data.size}): ${name}. Repo path: ${repoPath}. Implement Blob API for large files.`,
        );
      }

      // Decode Base64 content
      return Buffer.from(data.content, "base64");
    } catch (error: unknown) {
      if (this.isOctokitNotFoundError(error)) {
        throw new Error(`File not found: ${name} (repo path: ${repoPath})`);
      }
      console.error(`_readFile failed for repo path "${repoPath}":`, error);
      throw error;
    }
  }

  protected async _isFile(name: string): Promise<boolean> {
    const repoPath = this.getRepoPath(name);
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: repoPath,
        ref: this.ref,
      });

      return !Array.isArray(data) && data.type === "file";
    } catch (error: unknown) {
      if (this.isOctokitNotFoundError(error)) {
        return false; // Not found means it's not a file.
      }
      console.error(`_isFile check failed for repo path "${repoPath}":`, error);
      throw error;
    }
  }
  protected async _readdir(dir: string): Promise<DetectorFilesystemStat[]> {
    const repoPath = this.getRepoPath(dir);
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: repoPath,
        ref: this.ref,
      });

      // Expecting an array for directory listing
      if (!Array.isArray(data)) {
        // If it's not an array, the path might be a file or something else.
        const dataType =
          typeof data === "object" && data !== null && "type" in data
            ? (data as { type: string }).type
            : "unknown";
        throw new Error(
          `Path is not a directory (type: ${dataType}): ${dir} (repo path: ${repoPath})`,
        );
      }

      // Filter and map the results
      const result: DetectorFilesystemStat[] = [];
      for (const item of data) {
        // Only include files and directories, ignore symlinks, submodules etc.
        if (item.type === "file" || item.type === "dir") {
          result.push({
            name: item.name,
            path: item.path, // Full path from repo root provided by GitHub
            type: item.type, // 'file' or 'dir' matches expected type
          });
        }
      }
      return result;
    } catch (error: unknown) {
      if (this.isOctokitNotFoundError(error)) {
        throw new Error(`Directory not found: ${dir} (repo path: ${repoPath})`);
      }
      console.error(`_readdir failed for repo path "${repoPath}":`, error);
      throw error; // Re-throw other errors
    }
  }
  protected _chdir(name: string): DetectorFilesystem {
    const newPath = posixPath.resolve(this.currentPath, name);

    return new GithubFileSystemDetector({
      owner: this.owner,
      repo: this.repo,
      ref: this.ref,
      initialPath: newPath,
      apiToken: this.apiToken, // Pass the token to the new instance
    });
  }
}
