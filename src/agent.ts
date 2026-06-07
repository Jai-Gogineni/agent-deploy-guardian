import axios from "axios";
export interface DeployEvent { app: string; status: string; revision: string; }
export class DeployGuardianAgent {
  private argoUrl: string; private slackWebhook: string;
  constructor(argoUrl: string, slackWebhook: string) { this.argoUrl = argoUrl; this.slackWebhook = slackWebhook; }
  async checkSync(appName: string): Promise<DeployEvent> {
    const res = await axios.get(`${this.argoUrl}/api/v1/applications/${appName}`);
    return { app: appName, status: res.data.status.sync.status, revision: res.data.status.sync.revision };
  }
  async triggerRollback(appName: string): Promise<void> {
    await axios.post(`${this.argoUrl}/api/v1/applications/${appName}/rollback`, { id: 0 });
    await this.notify(`⚠️ Rolled back ${appName}`);
  }
  private async notify(msg: string): Promise<void> { await axios.post(this.slackWebhook, { text: msg }); }
}
