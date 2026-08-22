import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { BrandMemberRole, BrandMemberStatus, SystemRole } from "@prisma/client";
import {
  getBrandRolePermissionMap,
  hasBrandPermission,
  normalizeBrandCollaboratorRole,
  normalizeBrandPermissionConfig,
  type BrandCollaboratorRole,
  type BrandPermissionAction,
  type BrandPermissionConfig,
  type BrandPermissionKey,
  type BrandPermissionMap,
} from "../../../../../packages/shared/src/brand-permissions";
import {
  USER_ACCESS_FEATURE_KEYS,
  parseUserAccessFeatureKeysJson,
  type UserAccessFeatureKey,
} from "../../../../../packages/shared/src/user-access";
import { createId, database } from "../../common/mock-data";
import { AppConfigService } from "../../config/app-config.service";
import {
  getFeishuUserAppConfig,
  getFeishuUserIntegration,
  setFeishuUserAppConfig,
  setFeishuUserIntegration,
  type FeishuUserAppConfigRecord,
} from "../../common/user-integrations";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";

export type LoginPayload = {
  account: string;
  password: string;
};

export type RegisterPayload = {
  mobile: string;
  password: string;
  email: string;
  inviteCode?: string;
  nickname?: string;
};

export type UpdateProfilePayload = {
  nickname: string;
  mobile: string;
  avatarUrl?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  nextPassword: string;
};

export type UploadProfileAvatarPayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export type ProfileAvatarUploadRecord = {
  fileName: string;
  avatarUrl: string;
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
  accessExpiresAt?: string | null;
  allowedFeatureKeys?: UserAccessFeatureKey[];
  hasFullFeatureAccess?: boolean;
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

type RegistrationInviteCodeRecord = {
  id: string;
  code: string;
  consumedByUserId?: string;
  consumedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_LOCAL_USER_ID = "local_default_user";
const DEFAULT_LOCAL_BRAND_ID = "local_default_brand";

function loadRegistrationInviteCodeRecords() {
  const candidates = [
    resolve(process.cwd(), "prisma/seed-data/registration-invite-codes.txt"),
    resolve(process.cwd(), ".runtime/registration-invite-codes.txt"),
  ];

  const loaded = candidates.find((candidate) => existsSync(candidate));
  if (!loaded) {
    return [];
  }

  const content = readFileSync(loaded, "utf8").replace(/^\uFEFF/, "");
  const seenCodes = new Set<string>();
  const now = new Date().toISOString();

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((code) => {
      if (!code || seenCodes.has(code)) {
        return false;
      }
      seenCodes.add(code);
      return true;
    })
    .map((code, index) => ({
      id: `invite_${String(index + 1).padStart(3, "0")}`,
      code,
      createdAt: now,
      updatedAt: now,
    }));
}

const registrationInviteCodeRecords: RegistrationInviteCodeRecord[] = loadRegistrationInviteCodeRecords();

@Injectable()
export class AuthService {
  private readonly appConfigService = new AppConfigService();
  private readonly ossStorageService = new OssStorageService(this.appConfigService);
  private registrationInviteCodeSeedPromise: Promise<void> | null = null;

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
      this.assertUserAccessAvailability(user);

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
    this.assertUserAccessAvailability(user);

    return {
      accessToken: this.signToken({ sub: user.id, typ: "access", exp: this.getUnixTime() + this.getAccessTokenTtlSeconds() }),
      refreshToken: this.signToken({ sub: user.id, typ: "refresh", exp: this.getUnixTime() + this.getRefreshTokenTtlSeconds() }),
      currentBrandId: database.brands.find((item) => item.ownerUserId === user.id)?.id,
      brands: this.listMockBrands(user.id),
      user: this.toPublicUser(user),
    };
  }

  async register(payload: RegisterPayload) {
    const normalizedPayload = {
      ...payload,
      email: this.normalizeEmail(payload.email),
      mobile: payload.mobile.trim(),
      nickname: payload.nickname?.trim() || undefined,
      inviteCode: payload.inviteCode?.trim() || "",
    };
    this.assertRegisterPayload(normalizedPayload);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistrationInviteCodesSeeded();
      const exists = await this.prismaService.user.findFirst({
        where: {
          OR: [
            { mobile: normalizedPayload.mobile },
            { email: normalizedPayload.email },
          ],
        },
      });

      if (exists) {
        throw new ConflictException("该手机号或邮箱已存在");
      }

      const created = await this.prismaService.$transaction(async (tx) => {
        const invite = this.shouldRequireRegistrationInviteCode()
          ? await tx.registrationInviteCode.findUnique({
              where: { code: normalizedPayload.inviteCode },
              select: {
                id: true,
                consumedAt: true,
              },
            })
          : null;

        if (this.shouldRequireRegistrationInviteCode() && (!invite || invite.consumedAt)) {
          throw new BadRequestException("邀请码不存在、已失效或已被使用");
        }

        const user = await tx.user.create({
          data: {
            mobile: normalizedPayload.mobile,
            email: normalizedPayload.email,
            emailVerifiedAt: new Date(),
            nickname: normalizedPayload.nickname ?? `用户${Date.now().toString().slice(-4)}`,
            passwordHash: this.hashPassword(normalizedPayload.password),
            pointsBalance: 300,
            lastLoginAt: new Date(),
          },
        });

        const brand = await tx.brand.create({
          data: {
            ownerUserId: user.id,
            brandName: normalizedPayload.nickname ? `${normalizedPayload.nickname}的品牌` : `${normalizedPayload.mobile}的品牌`,
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

        if (invite?.id) {
          await tx.registrationInviteCode.update({
            where: { id: invite.id },
            data: {
              consumedAt: new Date(),
              consumedByUserId: user.id,
            },
          });
        }

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
      (item) => item.mobile === normalizedPayload.mobile || item.email === normalizedPayload.email,
    );

    if (exists) {
      throw new ConflictException("该手机号或邮箱已存在");
    }
    if (this.shouldRequireRegistrationInviteCode()) {
      this.consumeMockRegistrationInviteCode(normalizedPayload.inviteCode);
    }

    const user = {
      id: createId("usr"),
      mobile: normalizedPayload.mobile,
      email: normalizedPayload.email,
      emailVerifiedAt: new Date().toISOString(),
      nickname: normalizedPayload.nickname ?? `用户${database.users.length + 1}`,
      password: normalizedPayload.password,
      status: "ACTIVE" as const,
      membership: "FREE" as const,
      pointsBalance: 300,
    };
    const brand = {
      id: createId("brd"),
      ownerUserId: user.id,
      brandName: normalizedPayload.nickname ? `${normalizedPayload.nickname}的品牌` : `${normalizedPayload.mobile}的品牌`,
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
    if (this.shouldRequireRegistrationInviteCode()) {
      this.markMockRegistrationInviteCodeConsumed(normalizedPayload.inviteCode, user.id);
    }

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
    this.assertUserAccessAvailability(session.user);

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

  async resumeLocalSingleUserSession() {
    if (!this.appConfigService.isLocalSingleUserMode()) {
      throw new UnauthorizedException("当前运行环境不支持本地账号续用");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      throw new UnauthorizedException("本地数据库暂不可用，请稍后重试");
    }

    const candidate = await this.findLatestLocalSingleUserResumeCandidate();
    if (!candidate) {
      throw new UnauthorizedException("当前没有可续用的本地账号，请先登录");
    }

    this.assertUserAccessAvailability(candidate.user);
    await this.ensureOwnerBrandMemberships(candidate.user.id);
    const brands = await this.listAccessibleBrands(candidate.user.id);
    const currentBrandId = this.pickCurrentBrandId(brands, candidate.currentBrandId || undefined);
    const tokens = await this.issueSessionTokens(candidate.user.id, currentBrandId);

    await this.prismaService.user.update({
      where: { id: candidate.user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      ...tokens,
      currentBrandId,
      brands,
      user: this.toPublicDatabaseUser(candidate.user),
    };
  }

  getRegisterConfig() {
    const inviteCodeRequired = this.shouldRequireRegistrationInviteCode();
    if (inviteCodeRequired) {
      void this.ensureRegistrationInviteCodesSeeded();
    }
    return {
      runtimeMode: this.appConfigService.getRuntimeMode(),
      inviteCodeRequired,
      registrationMode: inviteCodeRequired ? "invite" : "open",
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
    const brands = this.shouldUseFallbackProfileData(auth)
      ? this.buildFallbackBrands(auth, currentUser.id)
      : await this.listAccessibleBrands(currentUser.id);
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
    const brands = this.shouldUseFallbackProfileData(auth)
      ? this.buildFallbackBrands(auth, currentUser.id)
      : await this.listAccessibleBrands(currentUser.id);
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

  async assertBrandAccess(brandId: string, auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.loadBrandAccess(brandId, auth.userId);
  }

  async assertBrandOwnerAccess(brandId: string, auth?: RequestAuthContext) {
    const access = await this.assertBrandAccess(brandId, auth);
    if (!access.isOwner) {
      throw new UnauthorizedException("只有品牌归属主账号可以执行该操作");
    }
    return access;
  }

  async assertBrandAdminAccess(brandId: string, auth?: RequestAuthContext) {
    const access = await this.assertBrandAccess(brandId, auth);
    if (access.role !== "ADMIN") {
      throw new UnauthorizedException("当前账号不是管理员，无法执行该操作");
    }
    return access;
  }

  async assertBrandPermission(
    brandId: string,
    permissionKey: BrandPermissionKey,
    action: BrandPermissionAction,
    auth?: RequestAuthContext,
  ) {
    const access = await this.assertBrandAccess(brandId, auth);
    if (!hasBrandPermission(access.role, access.permissionConfig, permissionKey, action)) {
      throw new UnauthorizedException(action === "edit" ? "当前账号没有该板块的编辑权限" : "当前账号没有该板块的查看权限");
    }
    return access;
  }

  async getProfile(auth?: RequestAuthContext) {
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    if (this.shouldUseFallbackProfileData(auth)) {
      return this.buildFallbackPublicUser(auth, currentUser.id);
    }
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

  async updateProfile(payload: UpdateProfilePayload, auth?: RequestAuthContext) {
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    const normalizedPayload = {
      nickname: payload.nickname.trim(),
      mobile: payload.mobile.trim(),
      avatarUrl: payload.avatarUrl?.trim() || "",
    };
    this.assertUpdateProfilePayload(normalizedPayload);

    if (await this.prismaService.canUseDatabase()) {
      const exists = await this.prismaService.user.findFirst({
        where: {
          mobile: normalizedPayload.mobile,
          NOT: { id: currentUser.id },
        },
        select: { id: true },
      });
      if (exists) {
        throw new ConflictException("该手机号已被其他账号使用");
      }

      const updated = await this.prismaService.user.update({
        where: { id: currentUser.id },
        data: {
          nickname: normalizedPayload.nickname,
          mobile: normalizedPayload.mobile,
          avatarUrl: normalizedPayload.avatarUrl || null,
        },
      });
      return this.toPublicDatabaseUser(updated);
    }

    const user = database.users.find((item) => item.id === currentUser.id);
    if (!user) {
      throw new UnauthorizedException("当前没有可用用户");
    }
    if (database.users.some((item) => item.id !== currentUser.id && item.mobile === normalizedPayload.mobile)) {
      throw new ConflictException("该手机号已被其他账号使用");
    }

    user.nickname = normalizedPayload.nickname;
    user.mobile = normalizedPayload.mobile;
    user.avatarUrl = normalizedPayload.avatarUrl || undefined;
    return this.toPublicUser(user);
  }

  async changePassword(payload: ChangePasswordPayload, auth?: RequestAuthContext) {
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    const normalizedPayload = {
      currentPassword: payload.currentPassword ?? "",
      nextPassword: payload.nextPassword ?? "",
    };
    this.assertChangePasswordPayload(normalizedPayload);

    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          passwordHash: true,
        },
      });
      if (!user) {
        throw new UnauthorizedException("当前没有可用用户");
      }

      const passwordCheck = this.verifyPassword(normalizedPayload.currentPassword, user.passwordHash);
      if (!passwordCheck.matched) {
        throw new UnauthorizedException("当前密码错误");
      }

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          passwordHash: this.hashPassword(normalizedPayload.nextPassword),
        },
      });

      return {
        success: true,
        message: "密码已更新",
        updatedAt: new Date().toISOString(),
      };
    }

    const user = database.users.find((item) => item.id === currentUser.id);
    if (!user) {
      throw new UnauthorizedException("当前没有可用用户");
    }
    if (user.password !== normalizedPayload.currentPassword) {
      throw new UnauthorizedException("当前密码错误");
    }

    user.password = normalizedPayload.nextPassword;
    return {
      success: true,
      message: "密码已更新",
      updatedAt: new Date().toISOString(),
    };
  }

  async uploadProfileAvatar(payload: UploadProfileAvatarPayload, auth?: RequestAuthContext): Promise<ProfileAvatarUploadRecord> {
    const currentUser = await this.resolveCurrentUser(undefined, auth);
    if (!payload.fileName || !payload.contentType || !payload.dataBase64) {
      throw new BadRequestException("头像上传参数不完整");
    }
    if (!payload.contentType.startsWith("image/")) {
      throw new BadRequestException("只支持上传图片格式的头像");
    }

    const extension = this.resolveAvatarExtension(payload.fileName, payload.contentType);
    const fileName = `${randomUUID()}${extension}`;
    const storageKey = this.buildProfileAvatarStorageKey(currentUser.id, fileName);
    await this.ossStorageService.putObject(storageKey, Buffer.from(payload.dataBase64, "base64"), payload.contentType);
    return {
      fileName,
      avatarUrl: this.buildProfileAvatarUrl(currentUser.id, fileName),
    };
  }

  async getProfileAvatar(userId: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const storageKey = this.buildProfileAvatarStorageKey(userId, safeFileName);
    const file = await this.ossStorageService.getObject(storageKey);
    if (!file) {
      throw new NotFoundException("头像文件不存在");
    }
    return file;
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

  private assertRegisterPayload(payload: RegisterPayload) {
    if (!payload.mobile) {
      throw new BadRequestException("请输入手机号");
    }
    if (!/^1\d{10}$/.test(payload.mobile)) {
      throw new BadRequestException("请输入正确的手机号");
    }
    this.assertEmail(payload.email);
    if (!payload.password || payload.password.length < 6) {
      throw new BadRequestException("密码至少 6 位");
    }
    if (this.shouldRequireRegistrationInviteCode() && (!payload.inviteCode || !/^[!-~]{6}$/.test(payload.inviteCode))) {
      throw new BadRequestException("请输入 6 位邀请码");
    }
  }

  private shouldRequireRegistrationInviteCode() {
    return true;
  }

  private async ensureRegistrationInviteCodesSeeded() {
    if (this.registrationInviteCodeSeedPromise) {
      return this.registrationInviteCodeSeedPromise;
    }

    this.registrationInviteCodeSeedPromise = (async () => {
      if (!(await this.prismaService.canUseDatabase())) {
        return;
      }

      if (!registrationInviteCodeRecords.length) {
        return;
      }

      const count = await this.prismaService.registrationInviteCode.count();
      if (count >= registrationInviteCodeRecords.length) {
        return;
      }

      await Promise.all(
        registrationInviteCodeRecords.map((record) =>
          this.prismaService.registrationInviteCode.upsert({
            where: { code: record.code },
            update: {},
            create: {
              code: record.code,
            },
          }),
        ),
      );
    })();

    try {
      await this.registrationInviteCodeSeedPromise;
    } finally {
      this.registrationInviteCodeSeedPromise = null;
    }
  }

  private assertUpdateProfilePayload(payload: UpdateProfilePayload) {
    if (!payload.nickname) {
      throw new BadRequestException("请输入用户名");
    }
    if (payload.nickname.length > 32) {
      throw new BadRequestException("用户名最多 32 个字符");
    }
    if (!payload.mobile) {
      throw new BadRequestException("请输入手机号");
    }
    if (!/^1\d{10}$/.test(payload.mobile)) {
      throw new BadRequestException("请输入正确的手机号");
    }
    if (payload.avatarUrl && !/^https?:\/\/|^\//.test(payload.avatarUrl)) {
      throw new BadRequestException("头像地址需使用 http(s) 链接或站内路径");
    }
  }

  private assertChangePasswordPayload(payload: ChangePasswordPayload) {
    if (!payload.currentPassword) {
      throw new BadRequestException("请输入当前密码");
    }
    if (!payload.nextPassword) {
      throw new BadRequestException("请输入新密码");
    }
    if (payload.nextPassword.length < 6) {
      throw new BadRequestException("新密码至少 6 位");
    }
    if (payload.currentPassword === payload.nextPassword) {
      throw new BadRequestException("新密码不能与当前密码相同");
    }
  }

  private resolveAvatarExtension(fileName: string, contentType: string) {
    const currentExtension = extname(fileName).toLowerCase();
    if (currentExtension) {
      return currentExtension;
    }

    switch (contentType.toLowerCase()) {
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      default:
        return ".jpg";
    }
  }

  private sanitizeStoredFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "");
  }

  private buildProfileAvatarStorageKey(userId: string, fileName: string) {
    return `users/${userId}/avatars/${fileName}`;
  }

  private buildProfileAvatarUrl(userId: string, fileName: string) {
    return `${this.appConfigService.getServerBaseUrl()}/api/auth/users/${userId}/avatar/${encodeURIComponent(fileName)}`;
  }

  private assertEmail(email: string) {
    if (!email) {
      throw new BadRequestException("请输入邮箱");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("请输入正确的邮箱地址");
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private consumeMockRegistrationInviteCode(inviteCode: string) {
    const record = registrationInviteCodeRecords.find((item) => item.code === inviteCode);
    if (!record || record.consumedAt) {
      throw new BadRequestException("邀请码不存在、已失效或已被使用");
    }
  }

  private markMockRegistrationInviteCodeConsumed(inviteCode: string, userId: string) {
    const record = registrationInviteCodeRecords.find((item) => item.code === inviteCode);
    if (!record || record.consumedAt) {
      throw new BadRequestException("邀请码不存在、已失效或已被使用");
    }

    const consumedAt = new Date().toISOString();
    record.consumedAt = consumedAt;
    record.consumedByUserId = userId;
    record.updatedAt = consumedAt;
  }

  private toPublicUser(user: (typeof database.users)[number]) {
    const allowedFeatureKeys = parseUserAccessFeatureKeysJson(user.allowedFeatureKeysJson);
    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || "",
      status: user.status,
      membership: user.membership,
      systemRole: user.systemRole ?? "USER",
      accessExpiresAt: user.accessExpiresAt ?? null,
      allowedFeatureKeys,
      hasFullFeatureAccess: !user.allowedFeatureKeysJson?.trim(),
      pointsBalance: user.pointsBalance,
    };
  }

  private toPublicDatabaseUser(user: {
    id: string;
    mobile: string;
    email: string | null;
    emailVerifiedAt?: Date | null;
    nickname: string | null;
    avatarUrl?: string | null;
    status: string;
    membership: string;
    systemRole?: string;
    accessExpiresAt?: Date | null;
    allowedFeatureKeysJson?: string | null;
    pointsBalance: number;
  }) {
    const allowedFeatureKeys = parseUserAccessFeatureKeysJson(user.allowedFeatureKeysJson);
    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email ?? "",
      emailVerified: Boolean(user.emailVerifiedAt),
      nickname: user.nickname ?? "",
      avatarUrl: user.avatarUrl ?? "",
      status: user.status,
      membership: user.membership,
      systemRole: user.systemRole ?? "USER",
      accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
      allowedFeatureKeys,
      hasFullFeatureAccess: !user.allowedFeatureKeysJson?.trim(),
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
      if (options?.fallbackToDefaultUser && !(await this.prismaService.canUseDatabase())) {
        return this.resolveFallbackAuthContext();
      }
      return undefined;
    }

    const parsed = this.verifyToken(token);
    if (parsed.typ !== "access" || !parsed.sub) {
      throw new UnauthorizedException("访问凭证无效");
    }
    const requestedBrandId = this.readHeaderValue(headers, "x-brand-id") || parsed.bid || undefined;

    if (await this.prismaService.canUseDatabase()) {
      try {
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
            status: true,
            accessExpiresAt: true,
            allowedFeatureKeysJson: true,
          },
        });
        if (!user) {
          throw new UnauthorizedException("当前用户不存在");
        }
        this.assertUserAccessAvailability(user);

        const brands = await this.listAccessibleBrands(user.id);
        const currentBrandId = this.pickCurrentBrandId(brands, requestedBrandId || session?.currentBrandId || undefined);
        const authContext: RequestAuthContext = {
          userId: user.id,
          sessionId: parsed.sid,
          brandId: currentBrandId,
          systemRole: user.systemRole,
          accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
          allowedFeatureKeys: parseUserAccessFeatureKeysJson(user.allowedFeatureKeysJson),
          hasFullFeatureAccess: !user.allowedFeatureKeysJson?.trim(),
          source: "token",
        };
        this.assertFeatureAccessFromHeaders(headers, authContext);
        return authContext;
      } catch (error) {
        if (this.shouldFallbackToDefaultUserOnAuthError(error, options)) {
          return this.resolveFallbackAuthContext({
            preferredUserId: parsed.sub,
            preferredBrandId: requestedBrandId,
            sessionId: parsed.sid,
          });
        }
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        throw error;
      }
    }

    const user = database.users.find((item) => item.id === parsed.sub);
    if (!user) {
      throw new UnauthorizedException("当前用户不存在");
    }
    this.assertUserAccessAvailability(user);

    const authContext: RequestAuthContext = {
      userId: user.id,
      sessionId: parsed.sid,
      brandId: this.readHeaderValue(headers, "x-brand-id") || parsed.bid || database.brands.find((item) => item.ownerUserId === user.id)?.id,
      systemRole: user.systemRole ?? "USER",
      accessExpiresAt: user.accessExpiresAt ?? null,
      allowedFeatureKeys: parseUserAccessFeatureKeysJson(user.allowedFeatureKeysJson),
      hasFullFeatureAccess: !user.allowedFeatureKeysJson?.trim(),
      source: "token",
    };
    this.assertFeatureAccessFromHeaders(headers, authContext);
    return authContext;
  }

  private async findLatestLocalSingleUserResumeCandidate() {
    const now = new Date();
    const latestRealSession = await this.prismaService.userSession.findFirst({
      where: {
        userId: {
          not: DEFAULT_LOCAL_USER_ID,
        },
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        user: {
          status: "ACTIVE",
          OR: [
            { accessExpiresAt: null },
            { accessExpiresAt: { gt: now } },
          ],
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latestRealSession?.user) {
      return {
        user: latestRealSession.user,
        currentBrandId: latestRealSession.currentBrandId || undefined,
      };
    }

    const latestRealUser = await this.prismaService.user.findFirst({
      where: {
        id: {
          not: DEFAULT_LOCAL_USER_ID,
        },
        status: "ACTIVE",
        OR: [
          { accessExpiresAt: null },
          { accessExpiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { lastLoginAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    if (!latestRealUser) {
      return null;
    }

    const latestUserSession = await this.prismaService.userSession.findFirst({
      where: {
        userId: latestRealUser.id,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        currentBrandId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      user: latestRealUser,
      currentBrandId: latestUserSession?.currentBrandId || undefined,
    };
  }

  private async resolveCurrentUser(
    userId?: string,
    auth?: RequestAuthContext,
    options?: { allowDefaultFallback?: boolean },
  ) {
    if (auth?.userId) {
      return { id: auth.userId };
    }
    if (await this.prismaService.canUseDatabase()) {
      if (!userId) {
        if (!options?.allowDefaultFallback) {
          throw new UnauthorizedException("请先登录");
        }
      }

      const user = userId
        ? await this.prismaService.user.findUnique({ where: { id: userId } })
        : await this.prismaService.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (!user) {
        throw new UnauthorizedException("当前没有可用用户");
      }
      return { id: user.id };
    }

    if (!userId && !options?.allowDefaultFallback) {
      throw new UnauthorizedException("请先登录");
    }

    const user = userId ? database.users.find((item) => item.id === userId) : database.users[0];
    if (!user) {
      throw new UnauthorizedException("当前没有可用用户");
    }
    return { id: user.id };
  }

  private async resolveFallbackAuthContext(options?: {
    preferredUserId?: string;
    preferredBrandId?: string;
    sessionId?: string;
  }): Promise<RequestAuthContext | undefined> {
    const preferredUserId = String(options?.preferredUserId || "").trim();
    let currentUser:
      | {
          id: string;
        }
      | undefined;
    if (preferredUserId) {
      try {
        currentUser = await this.resolveCurrentUser(preferredUserId, undefined, { allowDefaultFallback: true });
      } catch {
        currentUser = undefined;
      }
    }
    if (!currentUser) {
      currentUser = await this.resolveCurrentUser(undefined, undefined, { allowDefaultFallback: true });
    }
    const brands = await this.listAccessibleBrands(currentUser.id);
    const currentBrandId = this.pickCurrentBrandId(brands, String(options?.preferredBrandId || "").trim() || undefined);
    const user = await this.loadFallbackPublicUserSource(currentUser.id);
    if (user) {
      this.assertUserAccessAvailability(user);
    }
    return {
      userId: currentUser.id,
      sessionId: options?.sessionId,
      brandId: currentBrandId,
      source: "fallback",
      systemRole: user?.systemRole ?? "USER",
      accessExpiresAt: this.readDateValue(user?.accessExpiresAt)?.toISOString() ?? null,
      allowedFeatureKeys: parseUserAccessFeatureKeysJson(user?.allowedFeatureKeysJson),
      hasFullFeatureAccess: !user?.allowedFeatureKeysJson?.trim(),
    };
  }

  private shouldFallbackToDefaultUserOnAuthError(
    error: unknown,
    options?: { fallbackToDefaultUser?: boolean },
  ) {
    if (!options?.fallbackToDefaultUser) {
      return false;
    }
    if (!this.appConfigService.isLocalSingleUserMode()) {
      return false;
    }
    const message = error instanceof Error ? error.message : String(error || "");
    return [
      "Socket timeout",
      "database failed to respond",
      "SQLITE_BUSY",
      "SQLITE_LOCKED",
      "Timed out during query execution",
      "ConnectorError",
      "当前用户不存在",
      "登录态已失效",
    ].some((keyword) => message.includes(keyword));
  }

  private shouldUseFallbackProfileData(auth?: RequestAuthContext) {
    return Boolean(auth?.source === "fallback" && this.appConfigService.isLocalSingleUserMode());
  }

  private async buildFallbackPublicUser(auth: RequestAuthContext | undefined, userId?: string) {
    const baseUser = await this.loadFallbackPublicUserSource(userId || "");
    const publicBaseUser = baseUser
      ? this.toPublicUser({
          id: baseUser.id,
          email: baseUser.email || "",
          mobile: baseUser.mobile || "",
          nickname: baseUser.nickname || "",
          password: "",
          avatarUrl: baseUser.avatarUrl || undefined,
          emailVerifiedAt: new Date().toISOString(),
          status: baseUser.status || "ACTIVE",
          membership: baseUser.membership || "PRO",
          pointsBalance: baseUser.pointsBalance || 0,
          systemRole: baseUser.systemRole || "USER",
          accessExpiresAt: this.readDateValue(baseUser.accessExpiresAt)?.toISOString(),
          allowedFeatureKeysJson: baseUser.allowedFeatureKeysJson || "",
        })
      : this.toPublicUser(database.users[0]);
    return {
      ...publicBaseUser,
      id: userId || baseUser?.id || "",
      email: baseUser?.email || publicBaseUser.email || "",
      nickname: auth?.source === "fallback" && this.appConfigService.isLocalSingleUserMode()
        ? (baseUser?.nickname || "本地登录态用户")
        : (baseUser?.nickname || publicBaseUser.nickname || ""),
      systemRole: auth?.systemRole ?? baseUser?.systemRole ?? publicBaseUser.systemRole ?? "USER",
      accessExpiresAt: auth?.accessExpiresAt ?? baseUser?.accessExpiresAt ?? publicBaseUser.accessExpiresAt ?? null,
      allowedFeatureKeys: auth?.allowedFeatureKeys ?? parseUserAccessFeatureKeysJson(baseUser?.allowedFeatureKeysJson),
      hasFullFeatureAccess: auth?.hasFullFeatureAccess ?? !baseUser?.allowedFeatureKeysJson?.trim(),
    };
  }

  private async loadFallbackPublicUserSource(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          mobile: true,
          nickname: true,
          avatarUrl: true,
          status: true,
          membership: true,
          systemRole: true,
          accessExpiresAt: true,
          allowedFeatureKeysJson: true,
          pointsBalance: true,
        },
      });
      if (user) {
        return user;
      }
    }
    const mockUser = database.users.find((item) => item.id === userId);
    return mockUser
      ? {
          id: mockUser.id,
          email: mockUser.email || "",
          mobile: mockUser.mobile || "",
          nickname: mockUser.nickname || "",
          avatarUrl: mockUser.avatarUrl || null,
          status: mockUser.status || null,
          membership: mockUser.membership || null,
          systemRole: mockUser.systemRole || "USER",
          accessExpiresAt: mockUser.accessExpiresAt || null,
          allowedFeatureKeysJson: mockUser.allowedFeatureKeysJson || "",
          pointsBalance: mockUser.pointsBalance || 0,
        }
      : null;
  }

  private assertUserAccessAvailability(user: {
    status?: string | null;
    accessExpiresAt?: Date | string | null;
  }) {
    if (user.status && user.status !== "ACTIVE") {
      throw new UnauthorizedException("当前账号已被停用，请联系管理员");
    }

    const expiresAt = this.readDateValue(user.accessExpiresAt);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("当前账号使用期限已到期，请联系管理员");
    }
  }

  private readDateValue(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private assertFeatureAccessFromHeaders(
    headers: Record<string, string | string[] | undefined> | undefined,
    auth: RequestAuthContext,
  ) {
    const requiredFeatureKey = this.resolveRequiredFeatureKeyFromHeaders(headers);
    if (!requiredFeatureKey) {
      return;
    }
    this.assertFeatureAccess(auth, requiredFeatureKey);
  }

  private resolveRequiredFeatureKeyFromHeaders(headers?: Record<string, string | string[] | undefined>) {
    const rawPath = this.readHeaderValue(headers, "x-app-path")
      || this.extractPathnameFromUrl(this.readHeaderValue(headers, "referer"))
      || "";
    const pathname = rawPath.split("?")[0];
    if (!pathname) {
      return undefined;
    }

    if (pathname.startsWith("/admin")) {
      return USER_ACCESS_FEATURE_KEYS.ADMIN_CONSOLE;
    }
    if (pathname.startsWith("/personal-center/openclaw")) {
      return USER_ACCESS_FEATURE_KEYS.OPENCLAW;
    }
    if (
      pathname.startsWith("/personal-center")
      || pathname.startsWith("/membership-purchase")
      || pathname.startsWith("/points-purchase")
      || pathname.startsWith("/orders/")
    ) {
      return USER_ACCESS_FEATURE_KEYS.PERSONAL_CENTER;
    }
    if (pathname.startsWith("/brand-growth")) {
      return USER_ACCESS_FEATURE_KEYS.BRAND_GROWTH;
    }
    if (pathname.startsWith("/xiaohongshu")) {
      return USER_ACCESS_FEATURE_KEYS.XIAOHONGSHU;
    }
    if (pathname.startsWith("/douyin")) {
      return USER_ACCESS_FEATURE_KEYS.DOUYIN;
    }
    if (pathname.startsWith("/wechat")) {
      return USER_ACCESS_FEATURE_KEYS.WECHAT;
    }
    if (pathname.startsWith("/more-features/design")) {
      return USER_ACCESS_FEATURE_KEYS.DESIGN;
    }
    return undefined;
  }

  assertFeatureAccess(auth: RequestAuthContext | undefined, requiredFeatureKey: UserAccessFeatureKey) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    if (auth.hasFullFeatureAccess) {
      return;
    }
    const allowedFeatureKeys = auth.allowedFeatureKeys || [];
    if (allowedFeatureKeys.includes(requiredFeatureKey)) {
      return;
    }
    throw new ForbiddenException("当前账号无权使用该功能，请联系管理员开通权限");
  }

  private extractPathnameFromUrl(value: string | undefined) {
    if (!value) {
      return "";
    }
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  }

  private async listAccessibleBrands(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      let memberships = await this.prismaService.brandMember.findMany({
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

      if (!memberships.length && (await this.ensureOwnerBrandMemberships(userId))) {
        memberships = await this.prismaService.brandMember.findMany({
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
      }

      const normalizedMemberships = this.normalizeAccessibleBrandMemberships(memberships);
      return normalizedMemberships.map((item) => ({
        id: item.brand.id,
        brandName: item.brand.brandName,
        industry: item.brand.industry ?? "",
        role: normalizeBrandCollaboratorRole(item.role),
      }));
    }

    return this.listMockBrands(userId);
  }

  private normalizeAccessibleBrandMemberships<T extends { role: string; joinedAt: Date }>(memberships: T[]) {
    const collaborationMemberships = memberships.filter((item) => item.role !== BrandMemberRole.OWNER);
    if (collaborationMemberships.length) {
      return [collaborationMemberships[collaborationMemberships.length - 1]];
    }
    return memberships;
  }

  private listMockBrands(userId: string) {
    return database.brands
      .filter((item) => item.ownerUserId === userId)
      .map((item) => ({
        id: item.id,
        brandName: item.brandName,
        industry: item.industry ?? "",
        role: "ADMIN",
      }));
  }

  private buildFallbackBrands(auth: RequestAuthContext | undefined, userId: string) {
    const preferredBrandId = String(auth?.brandId || "").trim();
    if (preferredBrandId) {
      return [
        {
          id: preferredBrandId,
          brandName: "当前品牌",
          industry: "本地登录态",
          role: "ADMIN",
        },
      ];
    }
    const mockBrands = this.listMockBrands(userId);
    if (mockBrands.length) {
      return mockBrands;
    }
    return [
      {
        id: DEFAULT_LOCAL_BRAND_ID,
        brandName: "当前品牌",
        industry: "本地登录态",
        role: "ADMIN",
      },
    ];
  }

  private async loadBrandAccess(brandId: string, userId: string): Promise<{
    userId: string;
    brandId: string;
    role: BrandCollaboratorRole;
    rawRole: string;
    isOwner: boolean;
    permissionConfig: BrandPermissionConfig;
    permissions: BrandPermissionMap;
  }> {
    if (await this.prismaService.canUseDatabase()) {
      let membership = await this.prismaService.brandMember.findFirst({
        where: {
          brandId,
          userId,
          status: BrandMemberStatus.ACTIVE,
        },
        include: {
          brand: {
            select: {
              id: true,
              ownerUserId: true,
              memberPermissionsJson: true,
            },
          },
        },
      });
      if (!membership && (await this.ensureOwnerBrandMemberships(userId, { brandId }))) {
        membership = await this.prismaService.brandMember.findFirst({
          where: {
            brandId,
            userId,
            status: BrandMemberStatus.ACTIVE,
          },
          include: {
            brand: {
              select: {
                id: true,
                ownerUserId: true,
                memberPermissionsJson: true,
              },
            },
          },
        });
      }
      if (!membership) {
        throw new UnauthorizedException("当前账号无权访问该品牌");
      }
      const permissionConfig = normalizeBrandPermissionConfig(membership.brand.memberPermissionsJson);
      return {
        userId,
        brandId: membership.brand.id,
        role: normalizeBrandCollaboratorRole(membership.role),
        rawRole: membership.role,
        isOwner: membership.brand.ownerUserId === userId,
        permissions: getBrandRolePermissionMap(membership.role, permissionConfig),
        permissionConfig,
      };
    }

    const ownedBrand = database.brands.find((item) => item.id === brandId && item.ownerUserId === userId);
    if (!ownedBrand) {
      throw new UnauthorizedException("当前账号无权访问该品牌");
    }
    const permissionConfig = normalizeBrandPermissionConfig(undefined);
    return {
      userId,
      brandId,
      role: "ADMIN",
      rawRole: BrandMemberRole.OWNER,
      isOwner: true,
      permissions: getBrandRolePermissionMap("ADMIN", permissionConfig),
      permissionConfig,
    };
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

  private async ensureOwnerBrandMemberships(userId: string, options?: { brandId?: string }) {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }

    const ownedBrands = await this.prismaService.brand.findMany({
      where: {
        ownerUserId: userId,
        ...(options?.brandId ? { id: options.brandId } : {}),
      },
      select: { id: true },
    });
    if (!ownedBrands.length) {
      return false;
    }

    const ownedBrandIds = ownedBrands.map((brand) => brand.id);
    const existingMemberships = await this.prismaService.brandMember.findMany({
      where: {
        userId,
        brandId: {
          in: ownedBrandIds,
        },
      },
      select: {
        brandId: true,
        role: true,
        status: true,
      },
    });
    const existingMembershipMap = new Map(existingMemberships.map((item) => [item.brandId, item]));
    const brandsToRepair = ownedBrandIds.filter((brandId) => {
      const membership = existingMembershipMap.get(brandId);
      return !membership
        || membership.role !== BrandMemberRole.OWNER
        || membership.status !== BrandMemberStatus.ACTIVE;
    });
    if (!brandsToRepair.length) {
      return false;
    }

    for (const brandId of brandsToRepair) {
      await this.prismaService.brandMember.upsert({
        where: {
          brandId_userId: {
            brandId,
            userId,
          },
        },
        create: {
          brandId,
          userId,
          role: BrandMemberRole.OWNER,
          status: BrandMemberStatus.ACTIVE,
        },
        update: {
          role: BrandMemberRole.OWNER,
          status: BrandMemberStatus.ACTIVE,
        },
      });
    }

    return true;
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
    const configured = process.env.FEISHU_OAUTH_REDIRECT_URI?.trim();
    if (configured) {
      return configured;
    }
    const webBaseUrl = this.getWebBaseUrl().replace(/\/$/, "");
    return `${webBaseUrl}/api/auth/feishu/oauth/callback`;
  }

  private getWebBaseUrl() {
    const candidates = [
      process.env.WEB_BASE_URL,
      process.env.WEB_PUBLIC_BASE_URL,
      process.env.NEXT_PUBLIC_WEB_BASE_URL,
    ];
    for (const candidate of candidates) {
      const normalized = this.normalizeWebBaseUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }
    return "https://17ai.site";
  }

  private getDefaultFeishuScope() {
    return this.normalizeFeishuScope(
      process.env.FEISHU_OAUTH_SCOPE || "base:app:read base:table:read base:record:read wiki:node:read wiki:space:read drive:drive docs:doc sheets:spreadsheet",
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
      "drive:drive",
      "docs:doc",
      "sheets:spreadsheet",
    ];
    for (const requiredScope of requiredScopes) {
      if (!items.includes(requiredScope)) {
        items.push(requiredScope);
      }
    }
    return items.join(" ");
  }

  private normalizeWebBaseUrl(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return "";
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
      return process.env.NODE_ENV === "development" ? trimmed : "https://17ai.site";
    }
    return trimmed.replace(/\/$/, "");
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
