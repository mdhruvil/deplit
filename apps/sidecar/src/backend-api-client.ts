import { metadataSchema, updateBuildStatusSchema } from "./validators.js";
import { z } from "zod";

export type BuildStatusData = z.infer<typeof updateBuildStatusSchema> & {
  deploymentId: string;
  projectId: string;
};
export type MetadataData = z.infer<typeof metadataSchema> & {
  deploymentId: string;
};

export class BackendApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    if (!baseUrl) {
      throw new Error("Backend API URL is required for BackendApiClient.");
    }
    if (!apiKey) {
      throw new Error("API Key is required for BackendApiClient.");
    }
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
  }

  private async $fetch(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api/sidecar${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Could not read error body.");
      console.error(
        `[SIDECAR-->BACKEND_API] Request failed: ${path} ${response.status} ${response.statusText}`,
        errorBody,
      );
      throw new Error(
        `[SIDECAR-->BACKEND_API] Request failed: ${path} ${response.status} ${response.statusText}. Body: ${errorBody}`,
      );
    }
    return response.json();
  }

  async updateBuildStatus(data: BuildStatusData) {
    return this.$fetch("/build-status", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateMetadata(data: MetadataData) {
    return this.$fetch("/metadata", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
