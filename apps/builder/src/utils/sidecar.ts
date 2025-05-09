import { RouteMetadata } from "../postprocess.js";

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

  async updateBuildStatus(status: "SUCCESS" | "ERROR", message: string = "") {
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
}
