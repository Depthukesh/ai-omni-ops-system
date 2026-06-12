import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { database } from "../../common/mock-data";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService, type RequestAuthContext } from "../auth/auth.service";

type HeadersMap = Record<string, string | string[] | undefined>;

type OpenClawInstallTokenRow = {
  id: string;
  brandId: string;
  createdByUserId: string;
  tokenName: string;
  tokenHash: string;
  tokenPreview: string;
  status: string;
  lastUsedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type OpenClawInstallTokenRecord = {
  id: string;
  brandId: string;
  createdByUserId: string;
  tokenName: string;
  tokenPreview: string;
  status: "ACTIVE" | "REVOKED";
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawInstallWorkspace = {
  brandId: string;
  brandName: string;
  role: string;
  canManage: boolean;
  mcpServerName: string;
  mcpUrl: string;
  activeToken?: OpenClawInstallTokenRecord;
  snippetTemplates: {
    openclaw: string;
    workbuddy: string;
    cursor: string;
    claudeDesktop: string;
    mcpEndpoint: string;
  };
  skillGuide: {
    title: string;
    summary: string;
    examples: string[];
  };
  relationshipGuide: {
    title: string;
    items: Array<{
      label: string;
      summary: string;
    }>;
  };
  deliveryChecklist: {
    title: string;
    summary: string;
    items: string[];
  };
  docs: Array<{
    label: string;
    url: string;
  }>;
};

export type CreateOpenClawInstallTokenResult = {
  token: string;
  record: OpenClawInstallTokenRecord;
  workspace: OpenClawInstallWorkspace;
};

type FallbackInstallTokenRecord = OpenClawInstallTokenRow;

@Injectable()
export class OpenClawInstallationService {
  private bootstrapPromise?: Promise<void>;
  private readonly fallbackTokens: FallbackInstallTokenRecord[] = [];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async getInstallationWorkspace(auth: RequestAuthContext): Promise<OpenClawInstallWorkspace> {
    const brandId = await this.requireCurrentBrandId(auth);
    const access = await this.authService.assertBrandPermission(brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    const me = await this.authService.getMe(auth);
    const brand = me.brands.find((item) => item.id === brandId);
    const activeToken = await this.getActiveTokenRecord(brandId);
    return this.buildWorkspace({
      brandId,
      brandName: brand?.brandName || brandId,
      role: access.role,
      canManage: access.permissions["personalCenter.thirdPartyPlatforms"].edit,
      activeToken,
    });
  }

  async rotateInstallationToken(
    auth: RequestAuthContext,
    payload?: {
      tokenName?: string;
      expiresInDays?: number;
    },
  ): Promise<CreateOpenClawInstallTokenResult> {
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);

    const tokenName = String(payload?.tokenName || "").trim() || "OpenClaw 正式安装令牌";
    const expiresInDays = this.normalizeExpiresInDays(payload?.expiresInDays);
    const token = this.generateInstallToken();
    const tokenHash = this.hashToken(token);
    const tokenPreview = this.maskToken(token);
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : undefined;

    await this.revokeActiveTokens(brandId);
    const record = await this.insertTokenRecord({
      brandId,
      createdByUserId: auth.userId,
      tokenName,
      tokenHash,
      tokenPreview,
      expiresAt,
    });

    return {
      token,
      record,
      workspace: await this.buildWorkspace({
        brandId,
        brandName: (await this.authService.getMe(auth)).brands.find((item) => item.id === brandId)?.brandName || brandId,
        role: (await this.authService.assertBrandAccess(brandId, auth)).role,
        canManage: true,
        activeToken: record,
        rawToken: token,
      }),
    };
  }

  async revokeInstallationToken(auth: RequestAuthContext, tokenId: string) {
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);
    const current = await this.findTokenById(tokenId);
    if (!current || current.brandId !== brandId) {
      throw new NotFoundException("未找到指定的安装令牌");
    }
    await this.updateTokenStatus(tokenId, "REVOKED");
    return {
      success: true,
      tokenId,
      workspace: await this.getInstallationWorkspace(auth),
    };
  }

  async resolveInstallToken(headers?: HeadersMap): Promise<RequestAuthContext | undefined> {
    const authorizationHeader = this.readHeaderValue(headers, "authorization");
    const token = authorizationHeader?.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";
    if (!token || !token.startsWith("ocp_")) {
      return undefined;
    }

    const record = await this.findActiveTokenByHash(this.hashToken(token));
    if (!record) {
      throw new UnauthorizedException("OpenClaw 安装令牌无效");
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException("OpenClaw 安装令牌已过期");
    }

    const brandAccess = await this.authService.assertBrandAccess(record.brandId, {
      userId: record.createdByUserId,
      brandId: record.brandId,
      source: "token",
    });

    await this.touchToken(record.id);

    return {
      userId: record.createdByUserId,
      brandId: record.brandId,
      source: "token",
    };
  }

  private async buildWorkspace(input: {
    brandId: string;
    brandName: string;
    role: string;
    canManage: boolean;
    activeToken?: OpenClawInstallTokenRecord;
    rawToken?: string;
  }): Promise<OpenClawInstallWorkspace> {
    const mcpServerName = this.buildMcpServerName(input.brandName);
    const mcpUrl = `${this.appConfigService.getPublicApiBaseUrl()}/openclaw/mcp`;
    const installToken = input.rawToken || input.activeToken?.tokenPreview || "请先在网站中生成安装令牌";
    const headerValue = input.rawToken ? `Bearer ${input.rawToken}` : "Bearer 请先生成安装令牌";
    const docsBaseUrl = this.appConfigService.getWebPublicBaseUrl();
    return {
      brandId: input.brandId,
      brandName: input.brandName,
      role: input.role,
      canManage: input.canManage,
      mcpServerName,
      mcpUrl,
      activeToken: input.activeToken,
      snippetTemplates: {
        openclaw: JSON.stringify({
          mcp: {
            servers: {
              [mcpServerName]: {
                enabled: true,
                url: mcpUrl,
                transport: "streamable-http",
                headers: {
                  Authorization: headerValue,
                  "x-brand-id": input.brandId,
                },
              },
            },
          },
        }, null, 2),
        workbuddy: JSON.stringify({
          mcpServers: {
            [mcpServerName]: {
              url: mcpUrl,
              headers: {
                Authorization: headerValue,
                "x-brand-id": input.brandId,
              },
              type: "streamableHttp",
              timeout: 600000,
            },
          },
        }, null, 2),
        cursor: JSON.stringify({
          mcpServers: {
            [mcpServerName]: {
              url: mcpUrl,
              transport: "streamable-http",
              headers: {
                Authorization: headerValue,
                "x-brand-id": input.brandId,
              },
            },
          },
        }, null, 2),
        claudeDesktop: JSON.stringify({
          mcpServers: {
            [mcpServerName]: {
              url: mcpUrl,
              transport: "streamable-http",
              headers: {
                Authorization: headerValue,
                "x-brand-id": input.brandId,
              },
            },
          },
        }, null, 2),
        mcpEndpoint: `POST ${mcpUrl}\nAuthorization: ${headerValue}\nx-brand-id: ${input.brandId}`,
      },
      skillGuide: {
        title: "品牌运营助手 Skill",
        summary: "安装 MCP 后，Skill 负责把自然语言请求编排成品牌上下文查询、报告生成、知识库操作等工具调用。",
        examples: [
          "帮我看当前品牌最近的增长报告重点",
          "帮我创建一个品牌知识库，并把这份资料加入进去",
          "帮我看最近 30 天失败任务主要卡在哪些问题上",
          "围绕这个品牌生成一份半年营销规划",
        ],
      },
      relationshipGuide: {
        title: "MCP 与 Skill 关系",
        items: [
          {
            label: "当前正式安装",
            summary: "现在只需要安装 MCP。页面里的品牌运营助手 Skill 还是官方示例和使用规范，不是额外必须安装的执行包。",
          },
          {
            label: "后续如何扩展",
            summary: "后面新增网站能力时，先补 MCP 工具，再按业务场景补正式 Skill，让 Skill 去编排调用同一套网站能力。",
          },
          {
            label: "相似技能冲突",
            summary: "如果用户自己安装了相似 Skill，OpenClaw 可能按描述和上下文路由到任意一方。正式场景应优先让官方 Skill 调用 ai-omni-ops MCP。",
          },
        ],
      },
      deliveryChecklist: {
        title: "正式交付检查",
        summary: "给品牌管理员、实施同学和上线发布同学使用的最小检查清单，确保页面、文档、令牌与真实挂载链路都已可用。",
        items: [
          "部署最新前端版本，确认个人中心里的 OpenClaw 安装页面可访问",
          "验证生成令牌、停用令牌、复制配置三项核心操作",
          "验证两份正式文档链接都能打开，避免用户点击后出现 404",
          "使用页面生成的正式令牌，在真实 OpenClaw 客户端完成一次 MCP 挂载",
          "在真实对话里验证品牌上下文、任务摘要、报告摘要和知识库类能力至少各一次",
          "重置正式安装令牌后，确认旧令牌立即失效",
        ],
      },
      docs: [
        {
          label: "OpenClaw 正式安装说明",
          url: `${docsBaseUrl}/docs/openclaw/OpenClaw%E6%AD%A3%E5%BC%8F%E5%AE%89%E8%A3%85%E4%B8%8E%E7%BD%91%E7%AB%99%E5%AF%B9%E6%8E%A5%E8%AF%B4%E6%98%8E.html`,
        },
        {
          label: "品牌运营助手 Skill 示例",
          url: `${docsBaseUrl}/docs/openclaw/%E5%93%81%E7%89%8C%E8%BF%90%E8%90%A5%E5%8A%A9%E6%89%8BSkill%E7%A4%BA%E4%BE%8BSKILL.html`,
        },
      ],
    };
  }

  private buildMcpServerName(brandName: string) {
    const slug = String(brandName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return slug ? `ai-omni-ops-${slug}` : "ai-omni-ops-brand";
  }

  private normalizeExpiresInDays(value?: number) {
    if (!Number.isFinite(value) || Number(value) <= 0) {
      return 30;
    }
    return Math.min(365, Math.floor(Number(value)));
  }

  private generateInstallToken() {
    return `ocp_${randomBytes(24).toString("hex")}`;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private maskToken(token: string) {
    const normalized = String(token || "").trim();
    if (!normalized) {
      return "未生成";
    }
    return `${normalized.slice(0, 8)}********${normalized.slice(-6)}`;
  }

  private async requireCurrentBrandId(auth: RequestAuthContext) {
    if (auth.brandId) {
      return auth.brandId;
    }
    const brands = await this.authService.getBrands(auth);
    if (!brands.currentBrandId) {
      throw new UnauthorizedException("当前账号没有可用品牌");
    }
    return brands.currentBrandId;
  }

  private readHeaderValue(headers: HeadersMap | undefined, key: string) {
    const direct = headers?.[key] ?? headers?.[key.toLowerCase()] ?? headers?.[key.toUpperCase()];
    if (Array.isArray(direct)) {
      return direct[0];
    }
    return typeof direct === "string" ? direct : "";
  }

  private async getActiveTokenRecord(brandId: string) {
    return (await this.listTokenRecords(brandId)).find((item) => item.status === "ACTIVE");
  }

  private async listTokenRecords(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawInstallTokenRow[]>`
        SELECT *
        FROM "OpenClawInstallToken"
        WHERE "brandId" = ${brandId}
        ORDER BY "createdAt" DESC
      `;
      return rows.map((item) => this.normalizeTokenRow(item));
    }

    return this.fallbackTokens
      .filter((item) => item.brandId === brandId)
      .sort((left, right) => this.getTimestamp(right.createdAt) - this.getTimestamp(left.createdAt))
      .map((item) => this.normalizeTokenRow(item));
  }

  private async findTokenById(tokenId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawInstallTokenRow[]>`
        SELECT *
        FROM "OpenClawInstallToken"
        WHERE "id" = ${tokenId}
        LIMIT 1
      `;
      return rows[0] ? this.normalizeTokenRow(rows[0]) : undefined;
    }

    const matched = this.fallbackTokens.find((item) => item.id === tokenId);
    return matched ? this.normalizeTokenRow(matched) : undefined;
  }

  private async findActiveTokenByHash(tokenHash: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawInstallTokenRow[]>`
        SELECT *
        FROM "OpenClawInstallToken"
        WHERE "tokenHash" = ${tokenHash}
          AND "status" = 'ACTIVE'
        LIMIT 1
      `;
      return rows[0] ? this.normalizeTokenRow(rows[0]) : undefined;
    }

    const matched = this.fallbackTokens.find((item) => item.tokenHash === tokenHash && item.status === "ACTIVE");
    return matched ? this.normalizeTokenRow(matched) : undefined;
  }

  private async insertTokenRecord(input: {
    brandId: string;
    createdByUserId: string;
    tokenName: string;
    tokenHash: string;
    tokenPreview: string;
    expiresAt?: string;
  }) {
    const now = new Date().toISOString();
    const id = `openclaw_install_token_${Date.now()}`;
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawInstallTokenRow[]>`
        INSERT INTO "OpenClawInstallToken" (
          "id",
          "brandId",
          "createdByUserId",
          "tokenName",
          "tokenHash",
          "tokenPreview",
          "status",
          "lastUsedAt",
          "expiresAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${input.brandId},
          ${input.createdByUserId},
          ${input.tokenName},
          ${input.tokenHash},
          ${input.tokenPreview},
          'ACTIVE',
          NULL,
          ${input.expiresAt ? new Date(input.expiresAt) : null},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      return this.normalizeTokenRow(rows[0]);
    }

    const row: FallbackInstallTokenRecord = {
      id,
      brandId: input.brandId,
      createdByUserId: input.createdByUserId,
      tokenName: input.tokenName,
      tokenHash: input.tokenHash,
      tokenPreview: input.tokenPreview,
      status: "ACTIVE",
      lastUsedAt: null,
      expiresAt: input.expiresAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackTokens.unshift(row);
    return this.normalizeTokenRow(row);
  }

  private async revokeActiveTokens(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        UPDATE "OpenClawInstallToken"
        SET "status" = 'REVOKED', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "brandId" = ${brandId}
          AND "status" = 'ACTIVE'
      `;
      return;
    }

    for (const item of this.fallbackTokens) {
      if (item.brandId === brandId && item.status === "ACTIVE") {
        item.status = "REVOKED";
        item.updatedAt = new Date().toISOString();
      }
    }
  }

  private async updateTokenStatus(tokenId: string, status: "ACTIVE" | "REVOKED") {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        UPDATE "OpenClawInstallToken"
        SET "status" = ${status}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${tokenId}
      `;
      return;
    }

    const matched = this.fallbackTokens.find((item) => item.id === tokenId);
    if (matched) {
      matched.status = status;
      matched.updatedAt = new Date().toISOString();
    }
  }

  private async touchToken(tokenId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        UPDATE "OpenClawInstallToken"
        SET "lastUsedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${tokenId}
      `;
      return;
    }

    const matched = this.fallbackTokens.find((item) => item.id === tokenId);
    if (matched) {
      matched.lastUsedAt = new Date().toISOString();
      matched.updatedAt = new Date().toISOString();
    }
  }

  private normalizeTokenRow(row: OpenClawInstallTokenRow): OpenClawInstallTokenRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      createdByUserId: row.createdByUserId,
      tokenName: String(row.tokenName || "").trim() || "OpenClaw 正式安装令牌",
      tokenPreview: String(row.tokenPreview || "").trim(),
      status: row.status === "REVOKED" ? "REVOKED" : "ACTIVE",
      lastUsedAt: this.normalizeOptionalDate(row.lastUsedAt),
      expiresAt: this.normalizeOptionalDate(row.expiresAt),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || new Date().toISOString());
  }

  private normalizeOptionalDate(value: Date | string | null) {
    if (!value) {
      return undefined;
    }
    return this.normalizeDate(value);
  }

  private getTimestamp(value: Date | string) {
    const timestamp = new Date(this.normalizeDate(value)).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private async ensureTableReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTable();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTable() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OpenClawInstallToken" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "createdByUserId" TEXT NOT NULL,
        "tokenName" TEXT NOT NULL DEFAULT '',
        "tokenHash" TEXT NOT NULL,
        "tokenPreview" TEXT NOT NULL DEFAULT '',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "lastUsedAt" TIMESTAMPTZ NULL,
        "expiresAt" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "OpenClawInstallToken_tokenHash_key"
      ON "OpenClawInstallToken" ("tokenHash")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawInstallToken_brand_status_idx"
      ON "OpenClawInstallToken" ("brandId", "status", "createdAt" DESC)
    `);
  }
}
