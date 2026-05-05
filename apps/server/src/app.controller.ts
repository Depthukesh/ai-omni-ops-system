import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      app: "ai-omni-ops-system-server",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
