import { randomBytes } from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createId, database } from "../../common/mock-data";
import {
  getFeishuUserAppConfig,
  getFeishuUserIntegration,
  setFeishuUserAppConfig,
  setFeishuUserIntegration,
  type FeishuUserAppConfigRecord,
} from "../../common/user-integrations";
import { PrismaService } from "../../prisma/prisma.service";

export type LoginPayload = {
  account: string;
  password: string;
};

export type RegisterPayload = {
  mobile: string;
  password: string;
  email?: string;
  nickname?: string;
};

export type FeishuOauthStartRecord = {
  authorizeUrl: string;
  state: string;
  configured: boolean;
  message: string;
};

export type FeishuOauthStatusRecord = {
  configured: boolean;
  connected: boolean;
  userId: string;
  appId: string;
  redirectUri: string;
  scope: string;
  providerUserName: string;
  providerUserOpenId: string;
  expiresAt: string;
  message: string;
};

export type FeishuAppConfigPayload = {
  appId: string;
  appSecret: string;
  redirectUri?: string;
  scope?: string;
};

export type FeishuAppConfigRecord = {
  configured: boolean;
  userId: string;
  appId: string;
  appSecretMasked: string;
  redirectUri: string;
  scope: string;
  message: string;
  updatedAt: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  async login(payload: LoginPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [
            { mobile: payload.account },
            { email: payload.account },
            { nickname: payload.account },
          ],
        },
      });

      if (!user || user.passwordHash !== payload.password) {
        throw new UnauthorizedException("账号或密码错误");
      }

      return {
        accessToken: `mock-token-${user.id}`,
        refreshToken: `mock-refresh-${user.id}`,
        user: this.toPublicDatabaseUser(user),
      };
    }

    const user = database.users.find(
      (item) =>
        item.mobile === payload.account ||
        item.email === payload.account ||
        item.nickname === payload.account,
    );

    if (!user || user.password !== payload.password) {
      throw new UnauthorizedException("账号或密码错误");
    }

    return {
      accessToken: `mock-token-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      user: this.toPublicUser(user),
    };
  }

  async register(payload: RegisterPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const exists = await this.prismaService.user.findFirst({
        where: {
          OR: [
            { mobile: payload.mobile },
            ...(payload.email ? [{ email: payload.email }] : []),
          ],
        },
      });

      if (exists) {
        throw new ConflictException("该手机号或邮箱已存在");
      }

      const user = await this.prismaService.user.create({
        data: {
          mobile: payload.mobile,
          email: payload.email,
          nickname: payload.nickname ?? `用户${Date.now().toString().slice(-4)}`,
          passwordHash: payload.password,
          pointsBalance: 300,
        },
      });

      return {
        accessToken: `mock-token-${user.id}`,
        refreshToken: `mock-refresh-${user.id}`,
        user: this.toPublicDatabaseUser(user),
      };
    }

    const exists = database.users.some(
      (item) => item.mobile === payload.mobile || item.email === payload.email,
    );

    if (exists) {
      throw new ConflictException("该手机号或邮箱已存在");
    }

    const user = {
      id: createId("usr"),
      mobile: payload.mobile,
      email: payload.email ?? "",
      nickname: payload.nickname ?? `用户${database.users.length + 1}`,
      password: payload.password,
      status: "ACTIVE" as const,
      membership: "FREE" as const,
      pointsBalance: 300,
    };

    database.users.unshift(user);

    return {
      accessToken: `mock-token-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      user: this.toPublicUser(user),
    };
  }

  async getProfile() {
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!user) {
        throw new UnauthorizedException("当前没有可用用户");
      }

      return this.toPublicDatabaseUser(user);
    }

    return this.toPublicUser(database.users[0]);
  }

  async getPointLedgers() {
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (!user) {
        return [];
      }

      const rows = await this.prismaService.pointLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      return rows.map((item) => ({
        id: item.id,
        userId: item.userId,
        changeType: item.changeType,
        pointsDelta: item.pointsDelta,
        balanceAfter: item.balanceAfter,
        description: item.description ?? "",
        relatedTaskId: item.relatedTaskId ?? undefined,
        createdAt: item.createdAt.toISOString(),
      }));
    }

    return [...database.pointLedgers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getFeishuAppConfig(userId?: string): Promise<FeishuAppConfigRecord> {
    const currentUser = await this.resolveCurrentUser(userId);
    const config = await this.getUserFeishuOauthConfig(currentUser.id);
    if (!config) {
      return {
        configured: false,
        userId: currentUser.id,
        appId: "",
        appSecretMasked: "",
        redirectUri: this.getDefaultRedirectUri(),
        scope: this.getDefaultFeishuScope(),
        message: "当前用户尚未配置自己的飞书开放平台应用。",
        updatedAt: "",
      };
    }

    return {
      configured: true,
      userId: currentUser.id,
      appId: config.appId,
      appSecretMasked: this.maskSecret(config.appSecret),
      redirectUri: config.redirectUri,
      scope: this.normalizeFeishuScope(config.scope),
      message: "当前用户已配置自己的飞书开放平台应用。",
      updatedAt: config.updatedAt,
    };
  }

  async upsertFeishuAppConfig(payload: FeishuAppConfigPayload, userId?: string): Promise<FeishuAppConfigRecord> {
    const currentUser = await this.resolveCurrentUser(userId);
    const now = new Date().toISOString();
    const existing = await this.getUserFeishuOauthConfig(currentUser.id);
    const nextConfig: FeishuUserAppConfigRecord = {
      userId: currentUser.id,
      appId: payload.appId.trim(),
      appSecret: payload.appSecret.trim(),
      redirectUri: (payload.redirectUri || this.getDefaultRedirectUri()).trim(),
      scope: this.normalizeFeishuScope((payload.scope || existing?.scope || this.getDefaultFeishuScope()).trim()),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (!nextConfig.appId || !nextConfig.appSecret) {
      throw new ConflictException("请先填写当前用户自己的 App ID 和 App Secret");
    }

    await this.saveUserFeishuAppConfig(nextConfig);
    return {
      configured: true,
      userId: currentUser.id,
      appId: nextConfig.appId,
      appSecretMasked: this.maskSecret(nextConfig.appSecret),
      redirectUri: nextConfig.redirectUri,
      scope: nextConfig.scope,
      message: "已保存当前用户自己的飞书开放平台应用配置。",
      updatedAt: nextConfig.updatedAt,
    };
  }

  async getFeishuOauthStart(userId?: string, returnUrl?: string): Promise<FeishuOauthStartRecord> {
    const currentUser = await this.resolveCurrentUser(userId);
    const config = await this.getRequiredUserFeishuOauthConfig(currentUser.id);
    if (!config.appId || !config.appSecret) {
      return {
        authorizeUrl: "",
        state: "",
        configured: false,
        message: "当前用户尚未配置自己的飞书开放平台应用，请先填写 App ID 和 App Secret。",
      };
    }

    const state = this.encodeOauthState({
      userId: currentUser.id,
      returnUrl: returnUrl || `${config.webBaseUrl}/brand-growth`,
      nonce: randomBytes(12).toString("hex"),
    });
    const authorizeUrl = new URL("https://open.feishu.cn/open-apis/authen/v1/index");
    authorizeUrl.searchParams.set("app_id", config.appId);
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", this.normalizeFeishuScope(config.scope));

    return {
      authorizeUrl: authorizeUrl.toString(),
      state,
      configured: true,
      message: "已生成飞书用户授权地址，请使用当前登录用户自己的飞书账号完成授权。",
    };
  }

  async getFeishuOauthStatus(userId?: string): Promise<FeishuOauthStatusRecord> {
    const currentUser = await this.resolveCurrentUser(userId);
    const config = await this.getUserFeishuOauthConfig(currentUser.id);
    const integration = await this.getUserFeishuIntegration(currentUser.id);
    if (!config) {
      return {
        configured: false,
        connected: false,
        userId: currentUser.id,
        appId: "",
        redirectUri: this.getDefaultRedirectUri(),
        scope: this.getDefaultFeishuScope(),
        providerUserName: "",
        providerUserOpenId: "",
        expiresAt: "",
        message: "当前用户尚未配置自己的飞书开放平台应用。",
      };
    }
    if (!integration) {
      return {
        configured: true,
        connected: false,
        userId: currentUser.id,
        appId: config.appId,
        redirectUri: config.redirectUri,
        scope: this.normalizeFeishuScope(config.scope),
        providerUserName: "",
        providerUserOpenId: "",
        expiresAt: "",
        message: "当前用户尚未连接飞书账号。",
      };
    }

    return {
      configured: true,
      connected: true,
      userId: currentUser.id,
      appId: config.appId,
      redirectUri: config.redirectUri,
      scope: this.normalizeFeishuScope(config.scope),
      providerUserName: integration.providerUserName,
      providerUserOpenId: integration.providerUserOpenId,
      expiresAt: integration.expiresAt,
      message: "当前用户已连接自己的飞书账号。",
    };
  }

  async handleFeishuOauthCallback(code: string, state: string) {
    const parsedState = this.decodeOauthState(state);
    if (!parsedState?.userId) {
      return `${this.getWebBaseUrl()}/brand-growth?feishu_oauth=error&feishu_message=${encodeURIComponent("飞书授权状态无效，请重新发起连接。")}`;
    }
    const config = await this.getRequiredUserFeishuOauthConfig(parsedState.userId);

    try {
      const tokenResponse = await fetch("https://open.feishu.cn/open-apis/authen/v2/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: config.appId,
          client_secret: config.appSecret,
          redirect_uri: config.redirectUri,
        }),
      });
      const tokenPayload = (await tokenResponse.json()) as Record<string, unknown>;
      const tokenData = Object.keys(this.readObject(tokenPayload.data)).length
        ? this.readObject(tokenPayload.data)
        : tokenPayload;
      const accessToken = this.readString(tokenData, "access_token");
      const refreshToken = this.readString(tokenData, "refresh_token");
      const tokenCode = this.readNumber(tokenPayload, "code");
      if (!tokenResponse.ok || tokenCode !== 0 || !accessToken) {
        const errorMessage = this.readString(tokenPayload, "msg") || this.readString(tokenPayload, "message") || "飞书授权换取 token 失败";
        return `${parsedState.returnUrl || `${config.webBaseUrl}/brand-growth`}?feishu_oauth=error&feishu_message=${encodeURIComponent(errorMessage)}`;
      }

      const userInfoResponse = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const userInfoPayload = (await userInfoResponse.json()) as Record<string, unknown>;
      const userInfo = this.readObject(userInfoPayload.data);
      const now = new Date().toISOString();
      await this.saveUserFeishuIntegration({
        userId: parsedState.userId,
        provider: "FEISHU",
        providerUserOpenId: this.readString(userInfo, "open_id") || this.readString(userInfo, "union_id") || "",
        providerUserName: this.readString(userInfo, "name") || this.readString(userInfo, "en_name") || "飞书用户",
        providerUserAvatar: this.readString(userInfo, "avatar_url") || "",
        accessToken,
        refreshToken,
        scope: this.normalizeFeishuScope(this.readString(tokenData, "scope") || config.scope),
        expiresAt: new Date(Date.now() + Math.max(1, this.readNumber(tokenData, "expires_in")) * 1000).toISOString(),
        refreshExpiresAt: refreshToken
          ? new Date(Date.now() + Math.max(1, this.readNumber(tokenData, "refresh_expires_in")) * 1000).toISOString()
          : "",
        createdAt: now,
        updatedAt: now,
      });

      return `${parsedState.returnUrl || `${config.webBaseUrl}/brand-growth`}?feishu_oauth=success&feishu_message=${encodeURIComponent("飞书账号已连接，可直接同步当前用户自己的多维表格。")}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "飞书授权失败";
      return `${parsedState.returnUrl || `${config.webBaseUrl}/brand-growth`}?feishu_oauth=error&feishu_message=${encodeURIComponent(message)}`;
    }
  }

  private toPublicUser(user: (typeof database.users)[number]) {
    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      membership: user.membership,
      pointsBalance: user.pointsBalance,
    };
  }

  private toPublicDatabaseUser(user: {
    id: string;
    mobile: string;
    email: string | null;
    nickname: string | null;
    status: string;
    membership: string;
    pointsBalance: number;
  }) {
    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email ?? "",
      nickname: user.nickname ?? "",
      status: user.status,
      membership: user.membership,
      pointsBalance: user.pointsBalance,
    };
  }

  private async resolveCurrentUser(userId?: string) {
    if (await this.prismaService.canUseDatabase()) {
      const user = userId
        ? await this.prismaService.user.findUnique({ where: { id: userId } })
        : await this.prismaService.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (!user) {
        throw new UnauthorizedException("当前没有可用用户");
      }
      return { id: user.id };
    }

    const user = userId ? database.users.find((item) => item.id === userId) : database.users[0];
    if (!user) {
      throw new UnauthorizedException("当前没有可用用户");
    }
    return { id: user.id };
  }

  private async getUserFeishuOauthConfig(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.userFeishuIntegration.findUnique({
        where: { userId },
      });
      if (!row) {
        const fallbackConfig = getFeishuUserAppConfig(userId);
        if (!fallbackConfig) {
          return null;
        }
        await this.prismaService.userFeishuIntegration.upsert({
          where: { userId },
          create: {
            userId: fallbackConfig.userId,
            appId: fallbackConfig.appId,
            appSecret: fallbackConfig.appSecret,
            redirectUri: fallbackConfig.redirectUri,
            scope: fallbackConfig.scope,
          },
          update: {
            appId: fallbackConfig.appId,
            appSecret: fallbackConfig.appSecret,
            redirectUri: fallbackConfig.redirectUri,
            scope: fallbackConfig.scope,
          },
        });
        return fallbackConfig;
      }
      return {
        userId: row.userId,
        appId: row.appId,
        appSecret: row.appSecret,
        redirectUri: row.redirectUri,
        scope: row.scope,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }

    return getFeishuUserAppConfig(userId);
  }

  private async getUserFeishuIntegration(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.userFeishuIntegration.findUnique({
        where: { userId },
      });
      if (!row?.accessToken) {
        const fallbackIntegration = getFeishuUserIntegration(userId);
        if (!fallbackIntegration?.accessToken) {
          return null;
        }
        const fallbackConfig = getFeishuUserAppConfig(userId);
        await this.prismaService.userFeishuIntegration.upsert({
          where: { userId },
          create: {
            userId,
            appId: fallbackConfig?.appId || "",
            appSecret: fallbackConfig?.appSecret || "",
            redirectUri: fallbackConfig?.redirectUri || this.getDefaultRedirectUri(),
            scope: fallbackConfig?.scope || fallbackIntegration.scope || this.getDefaultFeishuScope(),
            providerUserOpenId: fallbackIntegration.providerUserOpenId,
            providerUserName: fallbackIntegration.providerUserName,
            providerUserAvatar: fallbackIntegration.providerUserAvatar,
            accessToken: fallbackIntegration.accessToken,
            refreshToken: fallbackIntegration.refreshToken || null,
            expiresAt: fallbackIntegration.expiresAt ? new Date(fallbackIntegration.expiresAt) : null,
            refreshExpiresAt: fallbackIntegration.refreshExpiresAt ? new Date(fallbackIntegration.refreshExpiresAt) : null,
          },
          update: {
            providerUserOpenId: fallbackIntegration.providerUserOpenId,
            providerUserName: fallbackIntegration.providerUserName,
            providerUserAvatar: fallbackIntegration.providerUserAvatar,
            accessToken: fallbackIntegration.accessToken,
            refreshToken: fallbackIntegration.refreshToken || null,
            scope: fallbackConfig?.scope || fallbackIntegration.scope || this.getDefaultFeishuScope(),
            expiresAt: fallbackIntegration.expiresAt ? new Date(fallbackIntegration.expiresAt) : null,
            refreshExpiresAt: fallbackIntegration.refreshExpiresAt ? new Date(fallbackIntegration.refreshExpiresAt) : null,
          },
        });
        return fallbackIntegration;
      }
      return {
        userId: row.userId,
        provider: "FEISHU" as const,
        providerUserOpenId: row.providerUserOpenId ?? "",
        providerUserName: row.providerUserName ?? "",
        providerUserAvatar: row.providerUserAvatar ?? "",
        accessToken: row.accessToken,
        refreshToken: row.refreshToken ?? "",
        scope: row.scope,
        expiresAt: row.expiresAt?.toISOString() ?? "",
        refreshExpiresAt: row.refreshExpiresAt?.toISOString() ?? "",
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }

    return getFeishuUserIntegration(userId);
  }

  private async saveUserFeishuAppConfig(record: FeishuUserAppConfigRecord) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.userFeishuIntegration.upsert({
        where: { userId: record.userId },
        create: {
          userId: record.userId,
          appId: record.appId,
          appSecret: record.appSecret,
          redirectUri: record.redirectUri,
          scope: record.scope,
        },
        update: {
          appId: record.appId,
          appSecret: record.appSecret,
          redirectUri: record.redirectUri,
          scope: record.scope,
        },
      });
      return record;
    }

    setFeishuUserAppConfig(record);
    return record;
  }

  private async saveUserFeishuIntegration(record: {
    userId: string;
    provider: "FEISHU";
    providerUserOpenId: string;
    providerUserName: string;
    providerUserAvatar: string;
    accessToken: string;
    refreshToken: string;
    scope: string;
    expiresAt: string;
    refreshExpiresAt: string;
    createdAt: string;
    updatedAt: string;
  }) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.userFeishuIntegration.upsert({
        where: { userId: record.userId },
        create: {
          userId: record.userId,
          appId: "",
          appSecret: "",
          redirectUri: this.getDefaultRedirectUri(),
          scope: this.normalizeFeishuScope(record.scope || this.getDefaultFeishuScope()),
          providerUserOpenId: record.providerUserOpenId,
          providerUserName: record.providerUserName,
          providerUserAvatar: record.providerUserAvatar,
          accessToken: record.accessToken,
          refreshToken: record.refreshToken || null,
          expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
          refreshExpiresAt: record.refreshExpiresAt ? new Date(record.refreshExpiresAt) : null,
        },
        update: {
          providerUserOpenId: record.providerUserOpenId,
          providerUserName: record.providerUserName,
          providerUserAvatar: record.providerUserAvatar,
          accessToken: record.accessToken,
          refreshToken: record.refreshToken || null,
          scope: this.normalizeFeishuScope(record.scope || this.getDefaultFeishuScope()),
          expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
          refreshExpiresAt: record.refreshExpiresAt ? new Date(record.refreshExpiresAt) : null,
        },
      });
      return record;
    }

    setFeishuUserIntegration(record);
    return record;
  }

  private async getRequiredUserFeishuOauthConfig(userId: string) {
    const config = await this.getUserFeishuOauthConfig(userId);
    if (!config?.appId || !config.appSecret) {
      return {
        appId: "",
        appSecret: "",
        redirectUri: this.getDefaultRedirectUri(),
        webBaseUrl: this.getWebBaseUrl(),
        scope: this.getDefaultFeishuScope(),
      };
    }
    return {
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri || this.getDefaultRedirectUri(),
      webBaseUrl: this.getWebBaseUrl(),
      scope: this.normalizeFeishuScope(config.scope || this.getDefaultFeishuScope()),
    };
  }

  private getDefaultRedirectUri() {
    return process.env.FEISHU_OAUTH_REDIRECT_URI || "http://localhost:3011/api/auth/feishu/oauth/callback";
  }

  private getWebBaseUrl() {
    return process.env.WEB_BASE_URL || "http://localhost:3001";
  }

  private getDefaultFeishuScope() {
    return this.normalizeFeishuScope(
      process.env.FEISHU_OAUTH_SCOPE || "base:app:read base:table:read base:record:read wiki:node:read wiki:space:read",
    );
  }

  private normalizeFeishuScope(scope: string) {
    const items = scope
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const requiredScopes = [
      "offline_access",
      "bitable:app:readonly",
      "base:record:retrieve",
    ];
    for (const requiredScope of requiredScopes) {
      if (!items.includes(requiredScope)) {
        items.push(requiredScope);
      }
    }
    return items.join(" ");
  }

  private maskSecret(secret: string) {
    if (!secret) {
      return "";
    }
    if (secret.length <= 8) {
      return `${secret.slice(0, 2)}***${secret.slice(-2)}`;
    }
    return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
  }

  private getFeishuOauthConfig() {
    return {
      appId: "",
      appSecret: "",
      redirectUri: this.getDefaultRedirectUri(),
      webBaseUrl: this.getWebBaseUrl(),
      scope: this.getDefaultFeishuScope(),
    };
  }

  private encodeOauthState(payload: { userId: string; returnUrl: string; nonce: string }) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  }

  private decodeOauthState(value: string) {
    try {
      const text = Buffer.from(value, "base64url").toString("utf8");
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return {
        userId: typeof parsed.userId === "string" ? parsed.userId : "",
        returnUrl: typeof parsed.returnUrl === "string" ? parsed.returnUrl : "",
      };
    } catch {
      return null;
    }
  }

  private readObject(value: unknown) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private readString(value: Record<string, unknown>, key: string) {
    const nextValue = value[key];
    return typeof nextValue === "string" ? nextValue : "";
  }

  private readNumber(value: Record<string, unknown>, key: string) {
    const nextValue = value[key];
    if (typeof nextValue === "number" && Number.isFinite(nextValue)) {
      return nextValue;
    }
    if (typeof nextValue === "string") {
      const parsed = Number(nextValue);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }
}
