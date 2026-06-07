export interface HealthCheckResult {
  endpoint: string;
  healthy: boolean;
  statusCode: number;
  responseTimeMs: number;
  error?: string;
}

export interface HealthCheckOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class HealthChecker {
  private defaultOptions: Required<HealthCheckOptions> = {
    timeoutMs: 10000,
    retries: 3,
    retryDelayMs: 2000,
  };

  async checkEndpoints(
    endpoints: string[],
    options?: HealthCheckOptions
  ): Promise<HealthCheckResult[]> {
    const opts = { ...this.defaultOptions, ...options };
    return Promise.all(endpoints.map((ep) => this.checkWithRetry(ep, opts)));
  }

  private async checkWithRetry(
    endpoint: string,
    options: Required<HealthCheckOptions>
  ): Promise<HealthCheckResult> {
    let lastResult: HealthCheckResult | undefined;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      lastResult = await this.checkEndpoint(endpoint, options.timeoutMs);

      if (lastResult.healthy) return lastResult;

      if (attempt < options.retries) {
        await this.delay(options.retryDelayMs);
      }
    }

    return lastResult!;
  }

  private async checkEndpoint(endpoint: string, timeoutMs: number): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return {
        endpoint,
        healthy: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        endpoint,
        healthy: false,
        statusCode: 0,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
