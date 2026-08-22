import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

type EnsureTableColumnDefinition = {
  name: string;
  definition: string;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }

  private readDatabaseUrl() {
    return String(process.env.DATABASE_URL || "").trim();
  }

  private quoteIdentifier(value: string) {
    return `"${String(value || "").replace(/"/g, "\"\"")}"`;
  }

  isConfigured() {
    return Boolean(this.readDatabaseUrl());
  }

  isLocalSqliteMode() {
    return this.readDatabaseUrl().toLowerCase().startsWith("file:");
  }

  isPostgresMode() {
    return this.isConfigured() && !this.isLocalSqliteMode();
  }

  getDatasourceKind() {
    if (!this.isConfigured()) {
      return "mock";
    }
    return this.isLocalSqliteMode() ? "sqlite" : "postgresql";
  }

  async canUseDatabase() {
    if (!this.isConfigured()) {
      return false;
    }

    const maxAttempts = this.isLocalSqliteMode() ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        await this.$queryRawUnsafe("SELECT 1");
        return true;
      } catch (error) {
        if (attempt >= maxAttempts || !this.shouldRetryDatabaseAvailability(error)) {
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
      }
    }
    return false;
  }

  private shouldRetryDatabaseAvailability(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!this.isLocalSqliteMode()) {
      return false;
    }
    return [
      "Socket timeout",
      "database failed to respond",
      "SQLITE_BUSY",
      "SQLITE_LOCKED",
      "Timed out during query execution",
      "ConnectorError",
    ].some((keyword) => message.includes(keyword));
  }

  async tableExists(tableName: string) {
    if (!this.isConfigured()) {
      return false;
    }
    const normalizedTableName = String(tableName || "").trim();
    if (!normalizedTableName) {
      return false;
    }

    if (this.isLocalSqliteMode()) {
      const rows = await this.$queryRawUnsafe<Array<{ name?: string }>>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) = lower(?) LIMIT 1",
        normalizedTableName,
      );
      return rows.length > 0;
    }

    const rows = await this.$queryRawUnsafe<Array<{ exists?: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND lower(table_name) = lower($1)
      ) AS "exists"`,
      normalizedTableName,
    );
    return Boolean(rows[0]?.exists);
  }

  async hasTableColumn(tableName: string, columnName: string) {
    if (!this.isConfigured()) {
      return false;
    }
    const normalizedTableName = String(tableName || "").trim();
    const normalizedColumnName = String(columnName || "").trim();
    if (!normalizedTableName || !normalizedColumnName) {
      return false;
    }

    if (this.isLocalSqliteMode()) {
      const rows = await this.$queryRawUnsafe<Array<{ name?: string }>>(
        `PRAGMA table_info(${this.quoteIdentifier(normalizedTableName)})`,
      );
      return rows.some((row) => String(row?.name || "").toLowerCase() === normalizedColumnName.toLowerCase());
    }

    const rows = await this.$queryRawUnsafe<Array<{ exists?: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND lower(table_name) = lower($1)
          AND lower(column_name) = lower($2)
      ) AS "exists"`,
      normalizedTableName,
      normalizedColumnName,
    );
    return Boolean(rows[0]?.exists);
  }

  async ensureTableColumns(tableName: string, columns: EnsureTableColumnDefinition[]) {
    if (!this.isConfigured() || !(await this.tableExists(tableName))) {
      return;
    }

    for (const column of columns || []) {
      const columnName = String(column?.name || "").trim();
      const definition = String(column?.definition || "").trim();
      if (!columnName || !definition) {
        continue;
      }
      if (await this.hasTableColumn(tableName, columnName)) {
        continue;
      }
      await this.$executeRawUnsafe(
        `ALTER TABLE ${this.quoteIdentifier(tableName)} ADD COLUMN ${this.quoteIdentifier(columnName)} ${definition}`,
      );
    }
  }

  jsonValueSql(value: unknown, options?: { nullable?: boolean }) {
    if (value == null) {
      return options?.nullable ? Prisma.sql`NULL` : Prisma.sql`${"null"}`;
    }

    const serialized = JSON.stringify(value);
    if (this.isLocalSqliteMode()) {
      return Prisma.sql`${serialized}`;
    }
    return Prisma.sql`CAST(${serialized} AS JSONB)`;
  }

  async getSchemaSummary(dbAvailable = false) {
    const reachable = this.isConfigured() ? dbAvailable : false;

    return {
      status: reachable ? "database-ready" : this.isConfigured() ? "database-unreachable" : "mock-ready",
      datasource: this.getDatasourceKind(),
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
