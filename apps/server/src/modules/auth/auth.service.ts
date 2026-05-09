import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { BrandMemberRole, BrandMemberStatus, SystemRole } from "@prisma/client";
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

export type RefreshSessionPayload = {
  refreshToken: string;
};

export type SwitchBrandPayload = {
  brandId: string;
};

export type RequestAuthContext = {
  userId: string;
  sessionId?: string;
  brandId?: string;
  systemRole?: SystemRole | "USER";
  source: "token" | "fallback";
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

      const passwordCheck = user ? this.verifyPassword(payload.password, user.passwordHash) : { matched: false, needsUpgrade: false };
      if (!user || !passwordCheck.matched) {
        throw new UnauthorizedException("账号或密码错误");
      }

      if (passwordCheck.needsUpgrade) {
        await this.prismaService.user.update({
          where: { id: user.id },
          data: {
            passwordHash: this.hashPassword(payload.password),
          },
        });
      }

      await this.ensureOwnerBrandMemberships(user.id);
      const brands = await this.listAccessibleBrands(user.id);
      const currentBrandId = this.pickCurrentBrandId(brands);
      const tokens = await this.issueSessionTokens(user.id, currentBrandId);
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      return {
        ...tokens,
        currentBrandId,
        brands,
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
      accessToken: this.signToken({ sub: user.id, typ: "access", exp: this.getUnixTime() + this.getAccessTokenTtlSeconds() }),
      refreshToken: this.signToken({ sub: user.id, typ: "refresh", exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds() }),
      currentBrandId: database.brands.find((item) => item.ownerUserId === user.id)?.id,
      brands: this.listMockBrands(user.id),
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

      const created = await this.prismaService.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            mobile: payload.mobile,
            email: payload.email,
            nickname: payload.nickname ?? `用户${Date.now().toString().slice(-4)}`,
            passwordHash: this.hashPassword(payload.password),
            pointsBalance: 300,
            lastLoginAt: new Date(),
          },
        });

        const brand = await tx.brand.create({
          data: {
            ownerUserId: user.id,
            brandName: payload.nickname ? `${payload.nickname}的品牌` : `${payload.mobile}的品牌`,
            industry: "待补充",
            storeCount: 0,
            foundedYear: new Date().getFullYear(),
            brandDescription: "",
            enterpriseIntro: "",
          },
        });

        await tx.brandMember.create({
          data: {
            brandId: brand.id,
            userId: user.id,
            role: BrandMemberRole.OWNER,
            status: BrandMemberStatus.ACTIVE,
          },
        });

        return {
          user,
          brand,
        };
      });

      const brands = await this.listAccessibleBrands(created.user.id);
      const currentBrandId = created.brand.id;
      const tokens = await this.issueSessionTokens(created.user.id, currentBrandId);

      return {
        ...tokens,
        currentBrandId,
        brands,
        user: this.toPublicDatabaseUser(created.user),
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
    const brand = {
      id: createId("brd"),
      ownerUserId: user.id,
      brandName: payload.nickname ? `${payload.nickname}的品牌` : `${payload.mobile}的品牌`,
      industry: "待补充",
      brandDescription: "",
      enterpriseIntro: "",
      storeCount: 0,
      foundedYear: new Date().getFullYear(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    database.users.unshift(user);
    database.brands.unshift(brand);

    return {
      accessToken: this.signToken({ sub: user.id, typ: "access", exp: this.getUnixTime() + this.getAccessTokenTtlSeconds(), bid: brand.id }),
      refreshToken: this.signToken({ sub: user.id, typ: "refresh", exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds(), bid: brand.id }),
      currentBrandId: brand.id,
      brands: this.listMockBrands(user.id),
      user: this.toPublicUser(user),
    };
  }

  async refreshSession(payload: RefreshSessionPayload) {
    if (!(await this.prismaService.canUseDatabase())) {
      const parsed = this.verifyToken(payload.refreshToken);
      if (parsed.typ !== "refresh" || !parsed.sub) {
        throw new UnauthorizedException("refresh token 无效");
      }
      return {
        accessToken: this.signToken({
          sub: parsed.sub,
          typ: "access",
          exp: this.getUnixTime() + this.getAccessTokenTtlSeconds(),
          bid: parsed.bid,
        }),
        refreshToken: this.signToken({
          sub: parsed.sub,
          typ: "refresh",
          exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds(),
          bid: parsed.bid,
        }),
      };
    }

    const parsed = this.verifyToken(payload.refreshToken);
    if (parsed.typ !== "refresh" || !parsed.sub || !parsed.sid) {
      throw new UnauthorizedException("refresh token 无效");
    }

    const session = await this.prismaService.userSession.findUnique({
      where: { id: parsed.sid },
      include: {
        user: true,
      },
    });
    if (!session || session.userId !== parsed.sub || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("refresh token 已失效");
    }
    if (session.refreshTokenHash !== this.hashSessionToken(payload.refreshToken)) {
      throw new UnauthorizedException("refresh token 不匹配");
    }

    await this.ensureOwnerBrandMemberships(session.userId);
    const brands = await this.listAccessibleBrands(session.userId);
    const currentBrandId = this.pickCurrentBrandId(brands, parsed.bid || session.currentBrandId || undefined);
    const tokens = await this.rotateSessionTokens(session.id, session.userId, currentBrandId);

    return {
      ...tokens,
      currentBrandId,
      brands,
      user: this.toPublicDatabaseUser(session.user),
    };
  }

  async logout(auth?: RequestAuthContext) {
    if (!auth?.sessionId || !(await this.prismaService.canUseDatabase())) {
      return { success: true };
    }

    await this.prismaService.userSession.updateMany({
      where: {
        id: auth.sessionId,
        userId: auth.userId,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  async getMe(auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    const brands = await this.listAccessibleBrands(currentUser.id);
    const currentBrandId = this.pickCurrentBrandId(brands, auth?.brandId);

    return {
      user: await this.getProfile(auth),
      brands,
      currentBrandId,
    };
  }

  async getBrands(auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    const brands = await this.listAccessibleBrands(currentUser.id);
    return {
      brands,
      currentBrandId: this.pickCurrentBrandId(brands, auth?.brandId),
    };
  }

  async switchBrand(payload: SwitchBrandPayload, auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    const brands = await this.listAccessibleBrands(currentUser.id);
    const currentBrandId = this.pickCurrentBrandId(brands, payload.brandId);
    if (!currentBrandId) {
      throw new UnauthorizedException("当前账号没有可切换的品牌");
    }

    if (await this.prismaService.canUseDatabase()) {
      const tokens = await this.rotateSessionTokens(auth?.sessionId, currentUser.id, currentBrandId);
      return {
        ...tokens,
        currentBrandId,
        brands,
      };
    }

    return {
      accessToken: this.signToken({
        sub: currentUser.id,
        typ: "access",
        exp: this.getUnixTime() + this.getAccessTokenTtlSeconds(),
        bid: currentBrandId,
      }),
      refreshToken: this.signToken({
        sub: currentUser.id,
        typ: "refresh",
        exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds(),
        bid: currentBrandId,
      }),
      currentBrandId,
      brands,
    };
  }

  async getProfile(auth?: RequestAuthContext) {
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: currentUser.id },
      });

      if (!user) {
        throw new UnauthorizedException("当前没有可用用户");
      }

      return this.toPublicDatabaseUser(user);
    }

    return this.toPublicUser(database.users.find((item) => item.id === currentUser.id) ?? database.users[0]);
  }

  async getPointLedgers(auth?: RequestAuthContext) {
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    if (await this.prismaService.canUseDatabase()) {
      const rows = await this.prismaService.pointLedger.findMany({
        where: { userId: currentUser.id },
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

    return [...database.pointLedgers]
      .filter((item) => item.userId === currentUser.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      systemRole: "USER" as const,
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
    systemRole?: string;
    pointsBalance: number;
  }) {
    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email ?? "",
      nickname: user.nickname ?? "",
      status: user.status,
      membership: user.membership,
      systemRole: user.systemRole ?? "USER",
      pointsBalance: user.pointsBalance,
    };
  }

  async resolveRequestAuthContext(
    headers?: Record<string, string | string[] | undefined>,
    options?: { fallbackToDefaultUser?: boolean },
  ): Promise<RequestAuthContext | undefined> {
    const authorizationHeader = this.readHeaderValue(headers, "authorization");
    const token = authorizationHeader?.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : "";
    if (!token) {
      if (options?.fallbackToDefaultUser) {
        return this.resolveFallbackAuthContext();
      }
      return undefined;
    }

    const parsed = this.verifyToken(token);
    if (parsed.typ !== "access" || !parsed.sub) {
      throw new UnauthorizedException("访问凭证无效");
    }

    if (await this.prismaService.canUseDatabase()) {
      const session = parsed.sid
        ? await this.prismaService.userSession.findUnique({
            where: { id: parsed.sid },
            select: {
              userId: true,
              currentBrandId: true,
              revokedAt: true,
              expiresAt: true,
            },
          })
        : null;
      if (parsed.sid && (!session || session.userId !== parsed.sub || session.revokedAt || session.expiresAt.getTime() <= Date.now())) {
        throw new UnauthorizedException("登录态已失效，请重新登录");
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: parsed.sub },
        select: {
          id: true,
          systemRole: true,
        },
      });
      if (!user) {
        throw new UnauthorizedException("当前用户不存在");
      }

      const requestedBrandId = this.readHeaderValue(headers, "x-brand-id") || parsed.bid || session?.currentBrandId || undefined;
      const brands = await this.listAccessibleBrands(user.id);
      const currentBrandId = this.pickCurrentBrandId(brands, requestedBrandId);
      return {
        userId: user.id,
        sessionId: parsed.sid,
        brandId: currentBrandId,
        systemRole: user.systemRole,
        source: "token",
      };
    }

    const user = database.users.find((item) => item.id === parsed.sub);
    if (!user) {
      throw new UnauthorizedException("当前用户不存在");
    }

    return {
      userId: user.id,
      sessionId: parsed.sid,
      brandId: this.readHeaderValue(headers, "x-brand-id") || parsed.bid || database.brands.find((item) => item.ownerUserId === user.id)?.id,
      systemRole: "USER",
      source: "token",
    };
  }

  private async resolveCurrentUser(userId?: string, auth?: RequestAuthContext) {
    if (auth?.userId) {
      return { id: auth.userId };
    }
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

  private async resolveFallbackAuthContext(): Promise<RequestAuthContext | undefined> {
    const currentUser = await this.resolveCurrentUser();
    const brands = await this.listAccessibleBrands(currentUser.id);
    return {
      userId: currentUser.id,
      brandId: this.pickCurrentBrandId(brands),
      source: "fallback",
      systemRole: "USER",
    };
  }

  private async listAccessibleBrands(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureOwnerBrandMemberships(userId);
      const memberships = await this.prismaService.brandMember.findMany({
        where: {
          userId,
          status: BrandMemberStatus.ACTIVE,
        },
        include: {
          brand: {
            select: {
              id: true,
              brandName: true,
              industry: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      });

      return memberships.map((item) => ({
        id: item.brand.id,
        brandName: item.brand.brandName,
        industry: item.brand.industry ?? "",
        role: item.role,
      }));
    }

    return this.listMockBrands(userId);
  }

  private listMockBrands(userId: string) {
    return database.brands
      .filter((item) => item.ownerUserId === userId)
      .map((item) => ({
        id: item.id,
        brandName: item.brandName,
        industry: item.industry ?? "",
        role: "OWNER",
      }));
  }

  private pickCurrentBrandId(
    brands: Array<{ id: string }>,
    requestedBrandId?: string,
  ) {
    if (requestedBrandId && brands.some((item) => item.id === requestedBrandId)) {
      return requestedBrandId;
    }
    return brands[0]?.id;
  }

  private async ensureOwnerBrandMemberships(userId: string) {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }

    const ownedBrands = await this.prismaService.brand.findMany({
      where: { ownerUserId: userId },
      select: { id: true },
    });

    await Promise.all(
      ownedBrands.map((brand) =>
        this.prismaService.brandMember.upsert({
          where: {
            brandId_userId: {
              brandId: brand.id,
              userId,
            },
          },
          create: {
            brandId: brand.id,
            userId,
            role: BrandMemberRole.OWNER,
            status: BrandMemberStatus.ACTIVE,
          },
          update: {
            role: BrandMemberRole.OWNER,
            status: BrandMemberStatus.ACTIVE,
          },
        }),
      ),
    );
  }

  private async issueSessionTokens(userId: string, brandId?: string) {
    if (!(await this.prismaService.canUseDatabase())) {
      return this.buildTokenPair(userId, undefined, brandId);
    }

    const sessionId = await this.createSession(userId, brandId);
    return this.rotateExistingSession(sessionId, userId, brandId);
  }

  private async rotateSessionTokens(sessionId: string | undefined, userId: string, brandId?: string) {
    if (!(await this.prismaService.canUseDatabase()) || !sessionId) {
      return this.buildTokenPair(userId, undefined, brandId);
    }

    return this.rotateExistingSession(sessionId, userId, brandId);
  }

  private async createSession(userId: string, brandId?: string) {
    const session = await this.prismaService.userSession.create({
      data: {
        userId,
        currentBrandId: brandId,
        refreshTokenHash: this.hashSessionToken(randomBytes(24).toString("hex")),
        expiresAt: new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000),
      },
      select: {
        id: true,
      },
    });

    return session.id;
  }

  private async rotateExistingSession(sessionId: string, userId: string, brandId?: string) {
    const refreshToken = this.signToken({
      sub: userId,
      sid: sessionId,
      typ: "refresh",
      exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds(),
      bid: brandId,
    });
    await this.prismaService.userSession.update({
      where: { id: sessionId },
      data: {
        currentBrandId: brandId,
        refreshTokenHash: this.hashSessionToken(refreshToken),
        expiresAt: new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000),
        revokedAt: null,
      },
    });

    return {
      accessToken: this.signToken({
        sub: userId,
        sid: sessionId,
        typ: "access",
        exp: this.getUnixTime() + this.getAccessTokenTtlSeconds(),
        bid: brandId,
      }),
      refreshToken,
    };
  }

  private buildTokenPair(userId: string, sessionId?: string, brandId?: string) {
    const accessToken = this.signToken({
      sub: userId,
      sid: sessionId,
      typ: "access",
      exp: this.getUnixTime() + this.getAccessTokenTtlSeconds(),
      bid: brandId,
    });
    const refreshToken = this.signToken({
      sub: userId,
      sid: sessionId,
      typ: "refresh",
      exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds(),
      bid: brandId,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${derived}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    if (!storedHash.startsWith("scrypt$")) {
      return {
        matched: storedHash === password,
        needsUpgrade: storedHash === password,
      };
    }

    const [, salt, expected] = storedHash.split("$");
    if (!salt || !expected) {
      return { matched: false, needsUpgrade: false };
    }

    const actual = scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, "hex");
    return {
      matched: expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual),
      needsUpgrade: false,
    };
  }

  private hashSessionToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private signToken(payload: { sub: string; sid?: string; typ: "access" | "refresh"; exp: number; bid?: string }) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url");
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = createHmac("sha256", this.getAuthSecret()).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${signature}`;
  }

  private verifyToken(token: string) {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) {
      throw new UnauthorizedException("访问凭证格式无效");
    }

    const expected = createHmac("sha256", this.getAuthSecret()).update(`${header}.${body}`).digest("base64url");
    if (expected !== signature) {
      throw new UnauthorizedException("访问凭证签名无效");
    }

    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
    const exp = typeof parsed.exp === "number" ? parsed.exp : 0;
    if (!exp || exp <= this.getUnixTime()) {
      throw new UnauthorizedException("访问凭证已过期");
    }

    return {
      sub: typeof parsed.sub === "string" ? parsed.sub : "",
      sid: typeof parsed.sid === "string" ? parsed.sid : "",
      typ: parsed.typ === "refresh" ? "refresh" : "access",
      bid: typeof parsed.bid === "string" ? parsed.bid : "",
      exp,
    };
  }

  private getAccessTokenTtlSeconds() {
    return Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 60 * 60 * 12);
  }

  private getRefreshTokenTtlSeconds() {
    return Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 14);
  }

  private getUnixTime() {
    return Math.floor(Date.now() / 1000);
  }

  private getAuthSecret() {
    return process.env.AUTH_TOKEN_SECRET || "ai-omni-ops-system-dev-secret";
  }

  private readHeaderValue(headers: Record<string, string | string[] | undefined> | undefined, key: string) {
    if (!headers) {
      return "";
    }
    const raw = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
    if (Array.isArray(raw)) {
      return raw[0] ?? "";
    }
    return typeof raw === "string" ? raw : "";
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
