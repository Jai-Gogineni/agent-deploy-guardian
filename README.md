# agent-deploy-guardian

[![CI](https://github.com/Jai-Gogineni/agent-deploy-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/Jai-Gogineni/agent-deploy-guardian/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Agent-purple.svg)](https://modelcontextprotocol.io)

> Deployment guardian — watches deployments, validates health, auto-rollbacks

## Architecture

```mermaid
flowchart TD
    A[Argo CD Sync Event] --> B[Deploy Guardian Agent]
    B --> C{Sync Status}
    C -->|Synced| D[Health Checker]
    C -->|Failed| E[Trigger Rollback]
    D -->|Healthy| F[✅ Notify Success]
    D -->|Unhealthy| E
    E --> G[🔄 Rollback Initiated]
    G --> H[Slack Notification]
    F --> H

    subgraph External
        I[Argo CD API]
        J[Slack Webhook]
        K[Service Endpoints]
    end

    B -.-> I
    H -.-> J
    D -.-> K
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Jai-Gogineni/agent-deploy-guardian.git
cd agent-deploy-guardian

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

Set the following environment variables:

| Variable | Description |
|----------|-------------|
| `ARGOCD_SERVER` | Argo CD server URL |
| `ARGOCD_TOKEN` | Argo CD API token |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |

## Project Structure

```
src/
├── agent.ts           # MCP server entry point
├── argocd-client.ts   # Argo CD API wrapper
├── health-checker.ts  # Post-deploy endpoint health validation
└── notifier.ts        # Slack webhook notifications
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `watch_deployment` | Watch sync status and validate post-deploy health |
| `trigger_rollback` | Manually trigger a rollback |
| `get_sync_status` | Get current Argo CD application sync status |

## License

MIT © 2024 Jai Gogineni
