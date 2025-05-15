import { DurableObject } from "cloudflare:workers";
import { Env } from "..";

export class DurableLogger extends DurableObject<Env> {
  logs: Array<{
    message: string;
    timestamp: Date;
    level: string;
  }> = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  pushLog(log: { message: string; timestamp: Date; level: string }) {
    this.logs.push(log);
  }

  getLogs() {
    return this.logs;
  }
}
