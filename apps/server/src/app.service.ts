import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealth() {
    return {
      app: "ai-omni-ops-system-server",
      status: "ok",
      prisma: await this.prismaService.getSchemaSummary(),
      timestamp: new Date().toISOString(),
    };
  }
}
