import { RouteMetadata } from "../postprocess.js";

export interface ProjectDetails {
  project: {
    id: string;
    name: string;
    fullName: string;
    githubUrl: string;
    framework: string | null;
    isSPA: boolean;
    envVars: Record<string, string> | null;
  };
  githubAccessToken: string | null;
}

export interface GitAuthCredentials {
  username: string;
  password: string;
}

export class Sidecar {
  constructor(
    private port: string,
    private token: string,
  ) {}

  /**
   * custom fetch
   * @param path path to fetch. must start with /
   */
  private async $fetch(path: string = "", options: RequestInit = {}) {
    const response = await fetch(`http://localhost:${this.port}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const data = await response.text().catch(() => {
        throw new Error(
          `[BUILDER-->SIDECAR] Request failed: ${path} ${response.status} ${response.statusText}`,
        );
      });
      if (data) {
        throw new Error(
          `[BUILDER-->SIDECAR] Request Failed: ${path} ${response.status} ${data}`,
        );
      }
      throw new Error(
        `[BUILDER-->SIDECAR] Request failed: ${path} ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  }

  /**
   * Waits for the sidecar to be healthy by pinging the /health endpoint.
   * @param timeoutMs maximum time to wait in milliseconds (default: 60000ms = 60 seconds)
   * @param intervalMs interval between ping attempts in milliseconds (default: 500ms)
   * @returns Promise that resolves when sidecar is healthy or rejects after timeout
   */
  async waitForSidecarHealth(
    timeoutMs = 60000,
    intervalMs = 500,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.$fetch("/health", {
          method: "POST",
        });

        if (response.ok === true) {
          console.log("[BUILDER-->SIDECAR] Health check successful");
          return;
        }
      } catch {
        // Ignore errors and continue trying until timeout
        console.log("[BUILDER-->SIDECAR] Health check failed, retrying...");
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `[BUILDER-->SIDECAR] Health check timed out after ${timeoutMs}ms`,
    );
  }

  async updateBuildStatus(
    status: "SUCCESS" | "ERROR" | "BUILDING",
    message: string = "",
  ) {
    const response = await this.$fetch("/build-status", {
      method: "POST",
      body: JSON.stringify({ status, message }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`[BUILDER-->SIDECAR] Failed to update build status.`);
    }
    return response;
  }

  async updateMetadata(data: {
    htmlRoutes: RouteMetadata[];
    assetsRoutes: RouteMetadata[];
    buildDurationMs: number;
  }) {
    const response = await this.$fetch("/metadata", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  }

  async exitSidecar() {
    const response = await this.$fetch("/exit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  }

  async getProjectDetails(): Promise<ProjectDetails> {
    const response = await this.$fetch("/project", {
      method: "GET",
    });
    return response;
  }
}
