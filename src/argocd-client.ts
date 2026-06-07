export interface ArgoCdConfig {
  serverUrl: string;
  token: string;
}

export interface SyncStatus {
  appName: string;
  status: "Synced" | "OutOfSync" | "Unknown";
  health: "Healthy" | "Degraded" | "Progressing" | "Missing" | "Unknown";
  revision: string;
  syncedAt?: string;
}

export interface RollbackResult {
  success: boolean;
  previousRevision: string;
  targetRevision: string;
  message: string;
}

export class ArgoCdClient {
  private config: ArgoCdConfig;

  constructor(config: ArgoCdConfig) {
    this.config = config;
  }

  async getSyncStatus(appName: string): Promise<SyncStatus> {
    const response = await fetch(
      `${this.config.serverUrl}/api/v1/applications/${appName}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Argo CD API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const status = data.status as Record<string, unknown>;
    const sync = status.sync as Record<string, unknown>;
    const health = status.health as Record<string, string>;

    return {
      appName,
      status: (sync.status as SyncStatus["status"]) ?? "Unknown",
      health: (health.status as SyncStatus["health"]) ?? "Unknown",
      revision: (sync.revision as string) ?? "",
      syncedAt: status.reconciledAt as string | undefined,
    };
  }

  async rollback(appName: string, revision?: string): Promise<RollbackResult> {
    const currentStatus = await this.getSyncStatus(appName);

    const targetRevision = revision ?? "HEAD~1";

    const response = await fetch(
      `${this.config.serverUrl}/api/v1/applications/${appName}/rollback`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revision: targetRevision }),
      }
    );

    return {
      success: response.ok,
      previousRevision: currentStatus.revision,
      targetRevision,
      message: response.ok ? "Rollback initiated" : `Rollback failed: ${response.statusText}`,
    };
  }
}
