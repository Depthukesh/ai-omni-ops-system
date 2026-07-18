import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }

  isConfigured() {
    return Boolean(process.env.DATABASE_URL);
  }

  async canUseDatabase() {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.$queryRawUnsafe("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async getSchemaSummary(dbAvailable = false) {
    const reachable = this.isConfigured() ? dbAvailable : false;

    return {
      status: reachable ? "database-ready" : this.isConfigured() ? "database-unreachable" : "mock-ready",
      datasource: "postgresql",
      models: [
        "User",
        "MembershipOrder",
        "PointLedger",
        "Brand",
        "UserFeishuIntegration",
        "Product",
        "BrandSurvey",
        "PlatformAccount",
        "CompetitorAccount",
        "IndustryReport",
        "BusinessAsset",
        "Task",
        "MediaAsset",
        "KnowledgeBase",
        "KnowledgeBaseFile",
        "KnowledgeBaseSyncRun",
        "KnowledgeBinding",
        "SkillPackage",
        "SkillPackageVersion",
        "ReferenceAsset",
        "ScriptAsset",
        "ModuleDefinition",
        "SkillPackageModule",
        "SkillPackageSkill",
        "SkillPackageKnowledgeSpace",
        "SkillPromptBinding",
      ],
    };
  }
}
