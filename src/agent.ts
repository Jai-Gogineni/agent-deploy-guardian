import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ArgoCdClient } from "./argocd-client.js";
import { HealthChecker } from "./health-checker.js";
import { Notifier } from "./notifier.js";

const server = new Server(
  { name: "agent-deploy-guardian", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "watch_deployment",
      description: "Watch an Argo CD application sync and validate post-deploy health",
      inputSchema: {
        type: "object" as const,
        properties: {
          appName: { type: "string", description: "Argo CD application name" },
          namespace: { type: "string", description: "Kubernetes namespace" },
          healthEndpoints: {
            type: "array",
            items: { type: "string" },
            description: "Endpoints to health-check after deploy",
          },
        },
        required: ["appName"],
      },
    },
    {
      name: "trigger_rollback",
      description: "Trigger a rollback for a failed deployment",
      inputSchema: {
        type: "object" as const,
        properties: {
          appName: { type: "string", description: "Argo CD application name" },
          revision: { type: "string", description: "Target revision to rollback to" },
        },
        required: ["appName"],
      },
    },
    {
      name: "get_sync_status",
      description: "Get current sync status of an Argo CD application",
      inputSchema: {
        type: "object" as const,
        properties: {
          appName: { type: "string", description: "Argo CD application name" },
        },
        required: ["appName"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const argoClient = new ArgoCdClient({
    serverUrl: process.env.ARGOCD_SERVER ?? "https://argocd.internal",
    token: process.env.ARGOCD_TOKEN ?? "",
  });

  const healthChecker = new HealthChecker();
  const notifier = new Notifier(process.env.SLACK_WEBHOOK_URL ?? "");

  switch (name) {
    case "watch_deployment": {
      const appName = args?.appName as string;
      const healthEndpoints = (args?.healthEndpoints as string[]) ?? [];

      const syncStatus = await argoClient.getSyncStatus(appName);

      if (syncStatus.status === "Synced" && syncStatus.health === "Healthy") {
        const healthResults = await healthChecker.checkEndpoints(healthEndpoints);
        const allHealthy = healthResults.every((r) => r.healthy);

        if (!allHealthy) {
          await argoClient.rollback(appName);
          await notifier.send({
            level: "critical",
            message: `Deployment ${appName} rolled back — health checks failed`,
            details: healthResults,
          });
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ syncStatus, healthResults, allHealthy }, null, 2) }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ syncStatus, message: "Sync in progress" }, null, 2) }],
      };
    }

    case "trigger_rollback": {
      const appName = args?.appName as string;
      const revision = args?.revision as string | undefined;
      const result = await argoClient.rollback(appName, revision);
      await notifier.send({ level: "warning", message: `Manual rollback triggered for ${appName}`, details: result });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    case "get_sync_status": {
      const appName = args?.appName as string;
      const status = await argoClient.getSyncStatus(appName);
      return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent Deploy Guardian MCP server running on stdio");
}

main().catch(console.error);
