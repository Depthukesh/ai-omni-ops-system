import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AssetCategory, BrandInviteStatus, BrandMemberRole, BrandMemberStatus, PlatformType, Prisma } from "@prisma/client";
import {
  BRAND_PERMISSION_TREE,
  buildDefaultBrandPermissionConfig,
  getBrandRolePermissionMap,
  normalizeBrandCollaboratorRole,
  normalizeBrandPermissionConfig,
  type BrandCollaboratorRole,
  type BrandPermissionConfig,
  type BrandPermissionMap,
} from "../../../../../packages/shared/src/brand-permissions";
import {
  createId,
  database,
  type KnowledgeBaseRecord,
  type KnowledgeBindingRecord,
  type KnowledgeRetrievalConfigRecord,
} from "../../common/mock-data";
import { AppConfigService } from "../../config/app-config.service";
import { KnowledgeBasesService } from "../admin/knowledge-bases.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";

const execFileAsync = promisify(execFile);
const BRAND_GROWTH_KNOWLEDGE_TARGET_ID = "brand-growth-workbench";
const BRAND_GROWTH_KNOWLEDGE_TARGET_NAME = "品牌增长工作台";
const BRAND_BUSINESS_ASSETS_KB_PREFIX = "kb_brand_business_assets_";
const BRAND_BUSINESS_ASSETS_SLUG_PREFIX = "brand-business-assets-";

type BusinessAssetKnowledgeMetadata = {
  sourceName?: string;
  storedFileName?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  knowledgeBaseSlug?: string;
  bindingType?: "MODULE" | "SKILL_PACKAGE" | "SKILL";
  targetId?: string;
  targetKey?: string;
  targetName?: string;
  priority?: number;
  retrievalMode?: "HYBRID" | "VECTOR" | "FULL_TEXT";
  isRequired?: boolean;
  enabled?: boolean;
  defaultTopK?: number;
  recallMode?: "HYBRID" | "VECTOR" | "FULL_TEXT";
  rerankEnabled?: boolean;
  retrievalThreshold?: number;
};

type ManagedKnowledgeBindingInput = {
  bindingType: "MODULE" | "SKILL_PACKAGE" | "SKILL";
  targetId: string;
  targetKey?: string;
  targetName?: string;
  priority: number;
  retrievalMode: "HYBRID" | "VECTOR" | "FULL_TEXT";
  isRequired: boolean;
  enabled: boolean;
};

type ManagedKnowledgeSpaceGroup = {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  knowledgeBaseSlug: string;
  description: string;
  files: CreateAssetPayload["items"];
  retrievalConfig: {
    defaultTopK: number;
    recallMode: "HYBRID" | "VECTOR" | "FULL_TEXT";
    rerankEnabled: boolean;
    retrievalThreshold?: number;
  };
  bindings: ManagedKnowledgeBindingInput[];
};

export type CreateBrandPayload = {
  ownerUserId?: string;
  brandName: string;
  industry?: string;
  storeCount?: number;
  foundedYear?: number;
  brandDescription?: string;
  enterpriseIntro?: string;
};

export type AddBrandMemberPayload = {
  account: string;
  role?: BrandCollaboratorRole;
};

export type UpdateBrandMemberPayload = {
  role?: BrandCollaboratorRole;
  status?: "ACTIVE" | "DISABLED" | "REMOVED";
};

export type CreateBrandInvitePayload = {
  role?: BrandCollaboratorRole;
  note?: string;
  expiresInDays?: number;
};

export type UpdateBrandPermissionSettingsPayload = {
  permissionConfig: BrandPermissionConfig;
};

export type AcceptBrandInviteByCodePayload = {
  inviteCode: string;
};

export type UpdateMyBrandInviteReadStatePayload = {
  inviteIds: string[];
  read?: boolean;
};

export type UpdateMyBrandInviteNotificationReadStatePayload = {
  notificationIds: string[];
  read?: boolean;
};

export type TransferBrandOwnerPayload = {
  memberId: string;
};

export type UpdateBackgroundPayload = {
  brandName?: string;
  industry?: string;
  storeCount?: number;
  foundedYear?: number;
  brandDescription?: string;
  enterpriseIntro?: string;
};

export type CreateProductPayload = {
  productName: string;
  productType?: string;
  price?: number;
  productPositioning?: string;
  targetAudience?: string;
  painPoint?: string;
  usageScenario?: string;
  differentiators?: string;
  marketPosition?: string;
  detailDescription?: string;
  imageUrl?: string;
};

export type UpdateProductPayload = CreateProductPayload;

export type UploadBrandProductImagePayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export type BrandProductImageUploadRecord = {
  fileName: string;
  imageUrl: string;
};

export type UploadBrandAssetFilePayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export type BrandAssetFileUploadRecord = {
  fileName: string;
  fileUrl: string;
};

export type UpsertSurveyPayload = {
  answers: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

export type ReplaceAccountsPayload = {
  accounts: Array<{
    id?: string;
    platform: "XIAOHONGSHU" | "DOUYIN" | "VIDEO_CHANNEL" | "WECHAT_OA";
    accountName: string;
    accountLink: string;
  }>;
};

export type CreateAssetPayload = {
  items: Array<{
    id?: string;
    title: string;
    description: string;
    sourceName?: string;
    fileUrl?: string;
    knowledgeBaseId?: string;
    knowledgeBaseName?: string;
    knowledgeBaseSlug?: string;
    bindingType?: "MODULE" | "SKILL_PACKAGE" | "SKILL";
    targetId?: string;
    targetKey?: string;
    targetName?: string;
    priority?: number;
    retrievalMode?: "HYBRID" | "VECTOR" | "FULL_TEXT";
    isRequired?: boolean;
    enabled?: boolean;
    defaultTopK?: number;
    recallMode?: "HYBRID" | "VECTOR" | "FULL_TEXT";
    rerankEnabled?: boolean;
    retrievalThreshold?: number;
  }>;
};

export type FeishuBindingPayload = {
  wikiUrl: string;
  baseToken?: string;
  tableId?: string;
  viewId?: string;
  title?: string;
  templateUrl?: string;
};

export type FeishuAuthStatusRecord = {
  authorized: boolean;
  identity: string;
  tokenStatus: string;
  expiresAt: string;
  grantedAt: string;
  userName: string;
  message: string;
};

export type FeishuAuthStartRecord = {
  verificationUri: string;
  verificationUriComplete: string;
  userCode: string;
  expiresIn: number;
};

export type BrandMemberListItem = {
  id: string;
  userId: string;
  nickname: string;
  mobile: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  isCurrentUser: boolean;
  isOwner: boolean;
};

export type BrandMemberListRecord = {
  brandId: string;
  brandName: string;
  currentUserRole: BrandCollaboratorRole;
  isCurrentUserOwner: boolean;
  canManageMembers: boolean;
  items: BrandMemberListItem[];
};

export type BrandPermissionSettingsRecord = {
  brandId: string;
  brandName: string;
  currentUserRole: BrandCollaboratorRole;
  isCurrentUserOwner: boolean;
  canManageMembers: boolean;
  canManagePermissions: boolean;
  permissionConfig: BrandPermissionConfig;
  currentUserPermissions: BrandPermissionMap;
  permissionTree: typeof BRAND_PERMISSION_TREE;
};

export type BrandInviteListItem = {
  id: string;
  inviteAccount: string;
  inviteCode: string;
  inviteLink: string;
  inviteeUserId?: string;
  inviteeNickname?: string;
  inviteeMobile?: string;
  inviteeEmail?: string;
  role: string;
  status: string;
  note?: string;
  invitedByUserId: string;
  invitedByName: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
  isMatchedUser: boolean;
  isRead?: boolean;
  readAt?: string;
};

export type BrandInviteListRecord = {
  brandId: string;
  brandName: string;
  items: BrandInviteListItem[];
};

export type PendingBrandInviteListRecord = {
  items: Array<
    BrandInviteListItem & {
      brandId: string;
      brandName: string;
    }
  >;
};

export type MyBrandInviteHistoryListRecord = {
  items: Array<
    BrandInviteListItem & {
      brandId: string;
      brandName: string;
    }
  >;
};

export type UpdateMyBrandInviteReadStateRecord = {
  inviteIds: string[];
  read: boolean;
  updatedCount: number;
};

export type BrandInviteNotificationItem = {
  notificationId: string;
  title: string;
  summary: string;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  brandId: string;
  brandName: string;
  invite: BrandInviteListItem;
};

export type BrandInviteNotificationListRecord = {
  unreadCount: number;
  items: BrandInviteNotificationItem[];
};

export type UpdateMyBrandInviteNotificationReadStateRecord = {
  notificationIds: string[];
  read: boolean;
  updatedCount: number;
};

export type BrandRoleAuditLogItem = {
  id: string;
  action: string;
  summary: string;
  operatorUserId: string;
  operatorName: string;
  targetUserId?: string;
  targetUserName?: string;
  targetInviteId?: string;
  createdAt: string;
};

export type BrandRoleAuditLogRecord = {
  brandId: string;
  brandName: string;
  items: BrandRoleAuditLogItem[];
};

const FEISHU_BINDING_TITLE = "FEISHU_COPY_BINDING";
const FEISHU_BINDING_KIND = "FEISHU_COPY_BINDING";

@Injectable()
export class BrandsService {
  private readonly appConfigService = new AppConfigService();
  private readonly ossStorageService = new OssStorageService(this.appConfigService);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly knowledgeBasesService?: KnowledgeBasesService,
  ) {}

  async getOverview() {
    if (await this.prismaService.canUseDatabase()) {
      return this.getOverviewFromDatabase();
    }

    return this.getOverviewFromMock();
  }

  async getBrandDetail(id: string) {
    return this.getArchive(id);
  }

  async getArchive(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      return this.getArchiveFromDatabase(id);
    }

    return this.getArchiveFromMock(id);
  }

  async listBrandMembers(id: string, currentUserId?: string): Promise<BrandMemberListRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }

    if (await this.prismaService.canUseDatabase()) {
      return this.buildBrandMemberListFromDatabase(id, currentUserId);
    }

    return this.listBrandMembersFromMock(id, currentUserId);
  }

  async listBrandInvites(id: string, currentUserId?: string): Promise<BrandInviteListRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.listBrandInvitesFromMock(id, currentUserId);
    }
    await this.requireBrandAdmin(id, currentUserId);
    return this.buildBrandInviteListFromDatabase(id);
  }

  async createBrandInvite(id: string, payload: CreateBrandInvitePayload, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.createBrandInviteFromMock(id, payload, currentUserId);
    }

    const manager = await this.requireBrandAdmin(id, currentUserId);
    const role = parseCollaboratorBrandRole(payload.role);
    this.assertCanAssignBrandRole(manager.role, role);
    await this.createBrandInviteRecord(id, {
      inviteAccount: "",
      inviteeUserId: undefined,
      role,
      note: payload.note,
      expiresInDays: payload.expiresInDays,
      invitedByUserId: currentUserId,
      auditSummary: `创建品牌邀请链接 -> ${normalizeBrandCollaboratorRole(role)}`,
      auditAction: "INVITE_CREATED",
    });

    return this.buildBrandInviteListFromDatabase(id);
  }

  async revokeBrandInvite(id: string, inviteId: string, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.revokeBrandInviteFromMock(id, inviteId, currentUserId);
    }

    const manager = await this.requireBrandAdmin(id, currentUserId);
    const invite = await this.prismaService.brandInvite.findFirst({
      where: {
        id: inviteId,
        brandId: id,
      },
    });
    if (!invite) {
      throw new NotFoundException("邀请记录不存在");
    }
    if (invite.status !== BrandInviteStatus.PENDING) {
      throw new ServiceUnavailableException("当前邀请已不可撤回");
    }
    this.assertCanAssignBrandRole(manager.role, invite.role);

    const revokedAt = new Date();
    await this.prismaService.$transaction(async (tx) => {
      await tx.brandInvite.update({
        where: { id: inviteId },
        data: {
          status: BrandInviteStatus.REVOKED,
          revokedAt,
        },
      });

      await this.logBrandRoleAudit(tx, {
        brandId: id,
        operatorUserId: currentUserId,
        targetInviteId: invite.id,
        targetUserId: invite.inviteeUserId ?? undefined,
        action: "INVITE_REVOKED",
        summary: `撤回品牌邀请：${invite.inviteAccount}`,
        detailJson: {
          inviteAccount: invite.inviteAccount,
          inviteCode: invite.inviteCode,
          revokedAt: revokedAt.toISOString(),
        },
      });

      if (invite.inviteeUserId) {
        await this.syncBrandInviteNotificationByInviteId(tx, invite.id, invite.inviteeUserId);
      }
    });

    return this.buildBrandInviteListFromDatabase(id);
  }

  async listMyPendingBrandInvites(currentUserId?: string): Promise<PendingBrandInviteListRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.listMyPendingBrandInvitesFromMock(currentUserId);
    }

    const now = new Date();
    await this.prismaService.brandInvite.updateMany({
      where: {
        status: BrandInviteStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: BrandInviteStatus.EXPIRED,
      },
    });

    const currentUser = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        mobile: true,
        email: true,
        nickname: true,
      },
    });
    if (!currentUser) {
      throw new UnauthorizedException("当前用户不存在");
    }

    const accountCandidates = [currentUser.id, currentUser.mobile, currentUser.email ?? "", currentUser.nickname ?? ""].filter(Boolean);
    const invites = await this.prismaService.brandInvite.findMany({
      where: {
        status: BrandInviteStatus.PENDING,
        OR: [{ inviteeUserId: currentUserId }, ...accountCandidates.map((item) => ({ inviteAccount: item }))],
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
        inviteeUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
            email: true,
          },
        },
        invitedByUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
        readStates: {
          where: {
            userId: currentUserId,
          },
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    await this.syncBrandInviteNotificationsForUser(currentUserId, invites);

    return {
      items: invites.map((item) => ({
        brandId: item.brand.id,
        brandName: item.brand.brandName,
        ...this.mapBrandInviteListItem(item, { currentUserId }),
      })),
    };
  }

  async listMyBrandInviteHistory(currentUserId?: string): Promise<MyBrandInviteHistoryListRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.listMyBrandInviteHistoryFromMock(currentUserId);
    }

    const currentUser = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        mobile: true,
        email: true,
        nickname: true,
      },
    });
    if (!currentUser) {
      throw new UnauthorizedException("当前用户不存在");
    }

    const now = new Date();
    await this.prismaService.brandInvite.updateMany({
      where: {
        status: BrandInviteStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: BrandInviteStatus.EXPIRED,
      },
    });

    const accountCandidates = [currentUser.id, currentUser.mobile, currentUser.email ?? "", currentUser.nickname ?? ""].filter(Boolean);
    const invites = await this.prismaService.brandInvite.findMany({
      where: {
        status: {
          in: [
            BrandInviteStatus.PENDING,
            BrandInviteStatus.ACCEPTED,
            BrandInviteStatus.EXPIRED,
            BrandInviteStatus.REVOKED,
          ],
        },
        OR: [{ inviteeUserId: currentUserId }, ...accountCandidates.map((item) => ({ inviteAccount: item }))],
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
        inviteeUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
            email: true,
          },
        },
        invitedByUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
        readStates: {
          where: {
            userId: currentUserId,
          },
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    await this.syncBrandInviteNotificationsForUser(currentUserId, invites);

    return {
      items: invites.map((item) => ({
        brandId: item.brand.id,
        brandName: item.brand.brandName,
        ...this.mapBrandInviteListItem(item, { currentUserId }),
      })),
    };
  }

  async updateMyBrandInviteReadState(
    payload: UpdateMyBrandInviteReadStatePayload,
    currentUserId?: string,
  ): Promise<UpdateMyBrandInviteReadStateRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请已读状态，请先连接数据库");
    }

    const inviteIds = Array.from(new Set((payload.inviteIds ?? []).map((item) => item.trim()).filter(Boolean)));
    if (!inviteIds.length) {
      throw new ServiceUnavailableException("请先选择要更新的邀请记录");
    }

    const currentUser = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        mobile: true,
        email: true,
        nickname: true,
      },
    });
    if (!currentUser) {
      throw new UnauthorizedException("当前用户不存在");
    }

    const accountCandidates = this.buildInviteAccountCandidates(currentUser);
    const matchedInvites = await this.prismaService.brandInvite.findMany({
      where: {
        id: {
          in: inviteIds,
        },
        OR: [{ inviteeUserId: currentUserId }, ...accountCandidates.map((item) => ({ inviteAccount: item }))],
      },
      select: {
        id: true,
      },
    });
    if (!matchedInvites.length) {
      throw new NotFoundException("未找到可更新的邀请记录");
    }

    const matchedInviteIds = matchedInvites.map((item) => item.id);
    const read = payload.read !== false;
    if (read) {
      const readAt = new Date();
      await this.prismaService.$transaction(async (tx) => {
        for (const inviteId of matchedInviteIds) {
          await tx.brandInviteReadState.upsert({
            where: {
              inviteId_userId: {
                inviteId,
                userId: currentUserId,
              },
            },
            create: {
              inviteId,
              userId: currentUserId,
              readAt,
            },
            update: {
              readAt,
            },
          });
        }
        await tx.brandInviteNotification.updateMany({
          where: {
            userId: currentUserId,
            inviteId: {
              in: matchedInviteIds,
            },
          },
          data: {
            readAt,
          },
        });
      });
    } else {
      await this.prismaService.$transaction(async (tx) => {
        await tx.brandInviteReadState.deleteMany({
          where: {
            userId: currentUserId,
            inviteId: {
              in: matchedInviteIds,
            },
          },
        });
        await tx.brandInviteNotification.updateMany({
          where: {
            userId: currentUserId,
            inviteId: {
              in: matchedInviteIds,
            },
          },
          data: {
            readAt: null,
          },
        });
      });
    }

    return {
      inviteIds: matchedInviteIds,
      read,
      updatedCount: matchedInviteIds.length,
    };
  }

  async listMyBrandInviteNotifications(currentUserId?: string): Promise<BrandInviteNotificationListRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      throw new ServiceUnavailableException("当前 mock 模式暂不支持站内邀请消息，请先连接数据库");
    }

    await this.syncBrandInviteNotificationsForUser(currentUserId);

    const notifications = await this.prismaService.brandInviteNotification.findMany({
      where: {
        userId: currentUserId,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
        invite: {
          include: {
            inviteeUser: {
              select: {
                id: true,
                nickname: true,
                mobile: true,
                email: true,
              },
            },
            invitedByUser: {
              select: {
                id: true,
                nickname: true,
                mobile: true,
              },
            },
            readStates: {
              where: {
                userId: currentUserId,
              },
              select: {
                userId: true,
                readAt: true,
              },
            },
          },
        },
      },
      orderBy: [{ readAt: "asc" }, { updatedAt: "desc" }],
    });

    return {
      unreadCount: notifications.filter((item) => item.readAt == null).length,
      items: notifications.map((item) => ({
        notificationId: item.id,
        title: item.title,
        summary: item.summary,
        actionUrl: item.actionUrl ?? undefined,
        readAt: item.readAt?.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        brandId: item.brand.id,
        brandName: item.brand.brandName,
        invite: this.mapBrandInviteListItem(item.invite, { currentUserId }),
      })),
    };
  }

  async updateMyBrandInviteNotificationReadState(
    payload: UpdateMyBrandInviteNotificationReadStatePayload,
    currentUserId?: string,
  ): Promise<UpdateMyBrandInviteNotificationReadStateRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      throw new ServiceUnavailableException("当前 mock 模式暂不支持站内邀请消息，请先连接数据库");
    }

    const notificationIds = Array.from(new Set((payload.notificationIds ?? []).map((item) => item.trim()).filter(Boolean)));
    if (!notificationIds.length) {
      throw new ServiceUnavailableException("请先选择要更新的消息记录");
    }

    const matchedNotifications = await this.prismaService.brandInviteNotification.findMany({
      where: {
        id: {
          in: notificationIds,
        },
        userId: currentUserId,
      },
      select: {
        id: true,
        inviteId: true,
      },
    });
    if (!matchedNotifications.length) {
      throw new NotFoundException("未找到可更新的消息记录");
    }

    const read = payload.read !== false;
    await this.updateMyBrandInviteReadState(
      {
        inviteIds: matchedNotifications.map((item) => item.inviteId),
        read,
      },
      currentUserId,
    );

    return {
      notificationIds: matchedNotifications.map((item) => item.id),
      read,
      updatedCount: matchedNotifications.length,
    };
  }

  async acceptBrandInvite(inviteId: string, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.acceptBrandInviteFromMock(inviteId, currentUserId);
    }

    const invite = await this.prismaService.brandInvite.findFirst({
      where: {
        id: inviteId,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
      },
    });
    if (!invite) {
      throw new NotFoundException("邀请记录不存在");
    }
    return this.acceptBrandInviteInternal(invite, currentUserId);
  }

  async acceptBrandInviteByCode(payload: AcceptBrandInviteByCodePayload, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.acceptBrandInviteByCodeFromMock(payload, currentUserId);
    }

    const inviteCode = payload.inviteCode.trim().toUpperCase();
    if (!inviteCode) {
      throw new ServiceUnavailableException("请输入邀请码");
    }

    const invite = await this.prismaService.brandInvite.findFirst({
      where: {
        inviteCode,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
      },
    });
    if (!invite) {
      throw new NotFoundException("邀请码不存在");
    }

    return this.acceptBrandInviteInternal(invite, currentUserId);
  }

  async addBrandMember(id: string, payload: AddBrandMemberPayload, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.addBrandMemberFromMock(id, payload, currentUserId);
    }

    const manager = await this.requireBrandAdmin(id, currentUserId);
    const account = payload.account.trim();
    if (!account) {
      throw new ServiceUnavailableException("请输入要添加的成员账号");
    }

    const targetUser = await this.prismaService.user.findFirst({
      where: {
        OR: [
          { id: account },
          { mobile: account },
          { email: account },
          { nickname: account },
        ],
      },
      select: {
        id: true,
      },
    });
    if (!targetUser) {
      throw new NotFoundException("未找到对应用户，请先注册该账号");
    }

    const role = parseCollaboratorBrandRole(payload.role);
    this.assertCanAssignBrandRole(manager.role, role);
    await this.createBrandInviteRecord(id, {
      inviteAccount: account,
      inviteeUserId: targetUser.id,
      role,
      invitedByUserId: currentUserId,
      auditSummary: `发起待确认成员邀请：${account} -> ${normalizeBrandCollaboratorRole(role)}`,
      auditAction: "MEMBER_INVITE_CREATED",
    });

    return this.buildBrandInviteListFromDatabase(id);
  }

  async updateBrandMember(id: string, memberId: string, payload: UpdateBrandMemberPayload, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.updateBrandMemberFromMock(id, memberId, payload, currentUserId);
    }

    const manager = await this.requireBrandAdmin(id, currentUserId);
    const targetMember = await this.prismaService.brandMember.findFirst({
      where: {
        id: memberId,
        brandId: id,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!targetMember) {
      throw new NotFoundException("品牌成员不存在");
    }
    if (targetMember.user.id === currentUserId) {
      throw new UnauthorizedException("暂不支持修改自己的品牌成员角色或状态");
    }
    if (targetMember.role === BrandMemberRole.OWNER) {
      throw new UnauthorizedException("当前版本暂不支持修改主账号成员");
    }
    this.assertCanManageTargetMember(manager.role, targetMember.role);

    const nextRole = payload.role ? parseCollaboratorBrandRole(payload.role) : targetMember.role;
    const nextStatus = payload.status ? parseManageableBrandStatus(payload.status) : targetMember.status;
    this.assertCanAssignBrandRole(manager.role, nextRole);

    await this.prismaService.$transaction(async (tx) => {
      await tx.brandMember.update({
        where: { id: memberId },
        data: {
          role: nextRole,
          status: nextStatus,
        },
      });

      await this.logBrandRoleAudit(tx, {
        brandId: id,
        operatorUserId: currentUserId,
        targetUserId: targetMember.user.id,
        action: "MEMBER_UPDATED",
        summary: `更新品牌成员：${normalizeBrandCollaboratorRole(targetMember.role)}/${targetMember.status} -> ${normalizeBrandCollaboratorRole(nextRole)}/${nextStatus}`,
        detailJson: {
          memberId,
          beforeRole: targetMember.role,
          beforeStatus: targetMember.status,
          nextRole,
          nextStatus,
        },
      });
    });

    return this.buildBrandMemberListFromDatabase(id, currentUserId);
  }

  async listBrandRoleAuditLogs(id: string, currentUserId?: string): Promise<BrandRoleAuditLogRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.listBrandRoleAuditLogsFromMock(id, currentUserId);
    }

    await this.requireBrandAdmin(id, currentUserId);
    return this.buildBrandRoleAuditLogsFromDatabase(id);
  }

  async getBrandPermissionSettings(id: string, currentUserId?: string): Promise<BrandPermissionSettingsRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.getBrandPermissionSettingsFromMock(id, currentUserId);
    }

    return this.buildBrandPermissionSettingsFromDatabase(id, currentUserId);
  }

  async updateBrandPermissionSettings(
    id: string,
    payload: UpdateBrandPermissionSettingsPayload,
    currentUserId?: string,
  ): Promise<BrandPermissionSettingsRecord> {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      throw new ServiceUnavailableException("当前 mock 模式暂不支持团队权限配置，请先连接数据库");
    }

    const manager = await this.requireBrandAdmin(id, currentUserId);
    const nextPermissionConfig = normalizeBrandPermissionConfig(payload.permissionConfig);
    await this.prismaService.$transaction(async (tx) => {
      await tx.brand.update({
        where: { id },
        data: {
          memberPermissionsJson: nextPermissionConfig as Prisma.InputJsonValue,
        },
      });

      await this.logBrandRoleAudit(tx, {
        brandId: id,
        operatorUserId: currentUserId,
        action: "PERMISSION_TEMPLATE_UPDATED",
        summary: `更新品牌协作权限模板：${normalizeBrandCollaboratorRole(manager.role)}`,
        detailJson: {
          roles: {
            STAFF: nextPermissionConfig.STAFF,
            TALENT: nextPermissionConfig.TALENT,
          },
        },
      });
    });

    return this.buildBrandPermissionSettingsFromDatabase(id, currentUserId);
  }

  async transferBrandOwnership(id: string, payload: TransferBrandOwnerPayload, currentUserId?: string) {
    if (!currentUserId) {
      throw new UnauthorizedException("请先登录");
    }
    if (!(await this.prismaService.canUseDatabase())) {
      return this.transferBrandOwnershipFromMock(id, payload, currentUserId);
    }

    const manager = await this.requireBrandMembership(id, currentUserId);
    if (manager.role !== BrandMemberRole.OWNER) {
      throw new UnauthorizedException("只有主账号可以转移品牌所有权");
    }

    const targetMember = await this.prismaService.brandMember.findFirst({
      where: {
        id: payload.memberId,
        brandId: id,
        status: BrandMemberStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
      },
    });
    if (!targetMember) {
      throw new NotFoundException("待转移的成员不存在");
    }
    if (targetMember.user.id === currentUserId) {
      throw new ServiceUnavailableException("当前成员已经是品牌主账号");
    }
    if (targetMember.role === BrandMemberRole.OWNER) {
      throw new ServiceUnavailableException("目标成员已经是主账号");
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.brand.update({
        where: { id },
        data: {
          ownerUserId: targetMember.user.id,
        },
      });

      await tx.brandMember.updateMany({
        where: {
          brandId: id,
          userId: currentUserId,
        },
        data: {
          role: BrandMemberRole.ADMIN,
          status: BrandMemberStatus.ACTIVE,
        },
      });

      await tx.brandMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          role: BrandMemberRole.OWNER,
          status: BrandMemberStatus.ACTIVE,
        },
      });

      await this.logBrandRoleAudit(tx, {
        brandId: id,
        operatorUserId: currentUserId,
        targetUserId: targetMember.user.id,
        action: "OWNER_TRANSFERRED",
        summary: `品牌主账号已转移给 ${targetMember.user.nickname ?? targetMember.user.mobile}`,
        detailJson: {
          previousOwnerUserId: currentUserId,
          nextOwnerUserId: targetMember.user.id,
          demotedRole: BrandMemberRole.ADMIN,
        },
      });
    });

    return this.buildBrandMemberListFromDatabase(id, currentUserId);
  }

  async createBrand(payload: CreateBrandPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const ownerUserId = payload.ownerUserId ?? (await this.getDefaultUserId());

      return this.prismaService.$transaction(async (tx) => {
        const brand = await tx.brand.create({
          data: {
            ownerUserId,
            brandName: payload.brandName,
            industry: payload.industry ?? "待补充",
            storeCount: payload.storeCount ?? 0,
            foundedYear: payload.foundedYear ?? new Date().getFullYear(),
            brandDescription: payload.brandDescription ?? "",
            enterpriseIntro: payload.enterpriseIntro ?? "",
            memberPermissionsJson: buildDefaultBrandPermissionConfig() as Prisma.InputJsonValue,
          },
        });

        await tx.brandMember.upsert({
          where: {
            brandId_userId: {
              brandId: brand.id,
              userId: ownerUserId,
            },
          },
          create: {
            brandId: brand.id,
            userId: ownerUserId,
            role: BrandMemberRole.OWNER,
            status: BrandMemberStatus.ACTIVE,
          },
          update: {
            role: BrandMemberRole.OWNER,
            status: BrandMemberStatus.ACTIVE,
          },
        });

        return brand;
      });
    }

    return this.createBrandFromMock(payload);
  }

  async updateBackground(id: string, payload: UpdateBackgroundPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      return this.prismaService.brand.update({
        where: { id },
        data: {
          brandName: payload.brandName,
          industry: payload.industry,
          storeCount: payload.storeCount,
          foundedYear: payload.foundedYear,
          brandDescription: payload.brandDescription,
          enterpriseIntro: payload.enterpriseIntro,
        },
      });
    }

    return this.updateBackgroundFromMock(id, payload);
  }

  async createProduct(id: string, payload: CreateProductPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      return this.mapProduct(
        await this.prismaService.product.create({
          data: {
            brandId: id,
            productName: payload.productName,
            productType: payload.productType ?? "待补充",
            price: this.toDecimal(payload.price ?? 0),
            productPositioning: payload.productPositioning ?? "",
            targetAudience: payload.targetAudience ?? "",
            painPoint: payload.painPoint ?? "",
            usageScenario: payload.usageScenario ?? "",
            differentiators: payload.differentiators ?? "",
            marketPosition: payload.marketPosition ?? "",
            detailDescription: payload.detailDescription ?? "",
            imageUrl: payload.imageUrl ?? "",
          },
        }),
      );
    }

    return this.createProductFromMock(id, payload);
  }

  async updateProduct(id: string, productId: string, payload: UpdateProductPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);
      await this.ensureProductExistsInDatabase(id, productId);

      return this.mapProduct(
        await this.prismaService.product.update({
          where: { id: productId },
          data: {
            productName: payload.productName,
            productType: payload.productType,
            price: payload.price === undefined ? undefined : this.toDecimal(payload.price),
            productPositioning: payload.productPositioning,
            targetAudience: payload.targetAudience,
            painPoint: payload.painPoint,
            usageScenario: payload.usageScenario,
            differentiators: payload.differentiators,
            marketPosition: payload.marketPosition,
            detailDescription: payload.detailDescription,
            imageUrl: payload.imageUrl,
          },
        }),
      );
    }

    return this.updateProductFromMock(id, productId, payload);
  }

  async deleteProduct(id: string, productId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);
      await this.ensureProductExistsInDatabase(id, productId);

      return this.mapProduct(
        await this.prismaService.product.delete({
          where: { id: productId },
        }),
      );
    }

    return this.deleteProductFromMock(id, productId);
  }

  async uploadProductImage(id: string, payload: UploadBrandProductImagePayload): Promise<BrandProductImageUploadRecord> {
    await this.ensureBrandExistsInMockOrDatabase(id);

    if (!payload.fileName || !payload.contentType || !payload.dataBase64) {
      throw new ServiceUnavailableException("图片上传参数不完整");
    }

    if (!payload.contentType.startsWith("image/")) {
      throw new ServiceUnavailableException("只支持上传图片文件");
    }

    const extension = this.resolveImageExtension(payload.fileName, payload.contentType);
    const fileName = `${randomUUID()}${extension}`;
    const storageKey = this.buildBrandProductImageStorageKey(id, fileName);
    await this.ossStorageService.putObject(storageKey, Buffer.from(payload.dataBase64, "base64"), payload.contentType);

    return {
      fileName,
      imageUrl: `${this.resolveServerBaseUrl()}/api/brands/${id}/product-images/${encodeURIComponent(fileName)}`,
    };
  }

  async getProductImage(id: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const file = await this.ossStorageService.getObject(this.buildBrandProductImageStorageKey(id, safeFileName));
    if (!file) {
      throw new NotFoundException("产品图片不存在");
    }
    return file;
  }

  async uploadAssetFile(id: string, payload: UploadBrandAssetFilePayload): Promise<BrandAssetFileUploadRecord> {
    await this.ensureBrandExistsInMockOrDatabase(id);

    if (!payload.fileName || !payload.dataBase64) {
      throw new ServiceUnavailableException("文档上传参数不完整");
    }

    const extension = this.resolveStoredExtension(payload.fileName);
    const fileName = `${randomUUID()}${extension}`;
    const contentType = payload.contentType || this.resolveFileContentType(fileName);
    const storageKey = this.buildBrandAssetFileStorageKey(id, fileName);
    await this.ossStorageService.putObject(storageKey, Buffer.from(payload.dataBase64, "base64"), contentType);

    return {
      fileName,
      fileUrl: `${this.resolveServerBaseUrl()}/api/brands/${id}/asset-files/${encodeURIComponent(fileName)}`,
    };
  }

  async getAssetFile(id: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const file = await this.ossStorageService.getObject(this.buildBrandAssetFileStorageKey(id, safeFileName));
    if (!file) {
      throw new NotFoundException("文档不存在");
    }
    return file;
  }

  async upsertSurvey(id: string, payload: UpsertSurveyPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      const existing = await this.prismaService.brandSurvey.findFirst({
        where: {
          brandId: id,
          surveyType: "BRAND_ARCHIVE",
        },
      });

      const data = {
        surveyJson: payload.answers as Prisma.InputJsonValue,
        summary: `${payload.answers.length} 项建档调研`,
      };

      if (existing) {
        await this.prismaService.brandSurvey.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prismaService.brandSurvey.create({
          data: {
            brandId: id,
            surveyType: "BRAND_ARCHIVE",
            ...data,
          },
        });
      }

      return payload.answers.map((answer) => ({
        id: createId("sur"),
        key: answer.key,
        label: answer.label,
        value: answer.value,
      }));
    }

    return this.upsertSurveyFromMock(id, payload);
  }

  async replacePlatformAccounts(id: string, payload: ReplaceAccountsPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.platformAccount.deleteMany({ where: { brandId: id } }),
        ...payload.accounts.map((account) =>
          this.prismaService.platformAccount.create({
            data: {
              brandId: id,
              platform: account.platform as PlatformType,
              accountName: account.accountName,
              accountLink: account.accountLink,
              username: account.accountName,
            },
          }),
        ),
      ]);

      return payload.accounts.map((account) => ({
        id: account.id ?? createId("acc"),
        platform: account.platform,
        accountName: account.accountName,
        accountLink: account.accountLink,
      }));
    }

    return this.replacePlatformAccountsFromMock(id, payload);
  }

  async replaceCompetitorAccounts(id: string, payload: ReplaceAccountsPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.competitorAccount.deleteMany({ where: { brandId: id } }),
        ...payload.accounts.map((account) =>
          this.prismaService.competitorAccount.create({
            data: {
              brandId: id,
              platform: account.platform as PlatformType,
              accountName: account.accountName,
              accountLink: account.accountLink,
              username: account.accountName,
            },
          }),
        ),
      ]);

      return payload.accounts.map((account) => ({
        id: account.id ?? createId("cmp"),
        platform: account.platform,
        accountName: account.accountName,
        accountLink: account.accountLink,
      }));
    }

    return this.replaceCompetitorAccountsFromMock(id, payload);
  }

  async replaceIndustryFeeds(id: string, payload: CreateAssetPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.industryReport.deleteMany({ where: { brandId: id } }),
        ...payload.items.map((item) =>
          this.prismaService.industryReport.create({
            data: {
              brandId: id,
              title: item.title,
              summary: item.description,
              fileUrl: item.fileUrl,
              sourceName: item.sourceName,
            },
          }),
        ),
      ]);

      return payload.items.map((item) => ({
        id: item.id ?? createId("ast"),
        title: item.title,
        description: item.description,
        sourceName: item.sourceName,
        fileUrl: item.fileUrl,
      }));
    }

    return this.replaceIndustryFeedsFromMock(id, payload);
  }

  async replaceBusinessAssets(id: string, payload: CreateAssetPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.businessAsset.deleteMany({
          where: {
            brandId: id,
            category: AssetCategory.BUSINESS_DATA,
          },
        }),
        ...payload.items.map((item) =>
          this.prismaService.businessAsset.create({
            data: {
              brandId: id,
              category: AssetCategory.BUSINESS_DATA,
              title: item.title,
              description: item.description,
              fileUrl: item.fileUrl,
              metadataJson: this.buildBusinessAssetMetadata(item),
            },
          }),
        ),
      ]);

      const managedKnowledgeBaseIds = await this.syncBusinessAssetsToKnowledgeBaseInDatabase(id, payload.items);
      if (managedKnowledgeBaseIds.length && this.knowledgeBasesService) {
        for (const knowledgeBaseId of managedKnowledgeBaseIds) {
          await this.knowledgeBasesService.startKnowledgeBaseFullSync(knowledgeBaseId);
        }
      }

      return payload.items.map((item) => ({
        id: item.id ?? createId("ast"),
        title: item.title,
        description: item.description,
        sourceName: item.sourceName,
        fileUrl: item.fileUrl,
        knowledgeBaseId: item.knowledgeBaseId,
        knowledgeBaseName: item.knowledgeBaseName,
        knowledgeBaseSlug: item.knowledgeBaseSlug,
        bindingType: item.bindingType,
        targetId: item.targetId,
        targetKey: item.targetKey,
        targetName: item.targetName,
        priority: item.priority,
        retrievalMode: item.retrievalMode,
        isRequired: item.isRequired,
        enabled: item.enabled,
        defaultTopK: item.defaultTopK,
        recallMode: item.recallMode,
        rerankEnabled: item.rerankEnabled,
        retrievalThreshold: item.retrievalThreshold,
      }));
    }

    return this.replaceBusinessAssetsFromMock(id, payload);
  }

  async getFeishuBinding(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      const binding = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId: id,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
        orderBy: { updatedAt: "desc" },
      });

      return this.mapFeishuBinding(binding);
    }

    this.getBrand(id);
    const binding = database.assets.find((item) => item.brandId === id && item.title === FEISHU_BINDING_TITLE);
    return this.mapFeishuBindingFromMock(binding);
  }

  async getFeishuAuthStatus(): Promise<FeishuAuthStatusRecord> {
    try {
      const payload = await this.runLarkCliJson(["auth", "status"]);
      const meta = this.readObject(payload);
      const tokenStatus = this.readString(meta, "tokenStatus") ?? "";
      const authorized = tokenStatus === "valid";
      return {
        authorized,
        identity: this.readString(meta, "identity") ?? "",
        tokenStatus,
        expiresAt: this.readString(meta, "expiresAt") ?? "",
        grantedAt: this.readString(meta, "grantedAt") ?? "",
        userName: this.readString(meta, "userName") ?? "",
        message: authorized ? "当前服务已完成飞书授权，可直接同步。" : "当前服务还未完成飞书授权。",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "当前服务还未完成飞书授权。";
      return {
        authorized: false,
        identity: "",
        tokenStatus: "invalid",
        expiresAt: "",
        grantedAt: "",
        userName: "",
        message,
      };
    }
  }

  async startFeishuAuth(): Promise<FeishuAuthStartRecord> {
    const payload = await this.runLarkCliJson(
      ["auth", "login", "--domain", "wiki", "--domain", "base", "--json"],
      { timeoutMs: 3000, allowPartialJsonOnError: true },
    );
    const meta = this.readObject(payload);
    return {
      verificationUri: this.readString(meta, "verification_uri") ?? "",
      verificationUriComplete: this.readString(meta, "verification_uri_complete") ?? "",
      userCode: this.readString(meta, "user_code") ?? "",
      expiresIn: this.readNumber(meta, "expires_in"),
    };
  }

  async upsertFeishuBinding(id: string, payload: FeishuBindingPayload) {
    const parsed = this.parseFeishuBindingUrl(payload.wikiUrl);
    const normalized = this.buildFeishuBindingMetadata(payload, parsed);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      const existing = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId: id,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
        select: { id: true },
      });

      const data = {
        brandId: id,
        category: AssetCategory.BUSINESS_DATA,
        title: FEISHU_BINDING_TITLE,
        description: "品牌小红书收集数据所绑定的飞书多维表格副本",
        fileUrl: payload.wikiUrl,
        metadataJson: normalized as Prisma.InputJsonValue,
      };

      const asset = existing
        ? await this.prismaService.businessAsset.update({
            where: { id: existing.id },
            data,
          })
        : await this.prismaService.businessAsset.create({ data });

      return this.mapFeishuBinding(asset);
    }

    this.getBrand(id);
    database.assets = database.assets.filter((item) => !(item.brandId === id && item.title === FEISHU_BINDING_TITLE));
    const asset = {
      id: createId("ast"),
      brandId: id,
      category: "BUSINESS_DATA" as const,
      title: FEISHU_BINDING_TITLE,
      description: "品牌小红书收集数据所绑定的飞书多维表格副本",
      fileUrl: payload.wikiUrl,
      metadataJson: normalized,
    };
    database.assets.unshift(asset);
    return this.mapFeishuBindingFromMock(asset);
  }

  private getOverviewFromMock() {
    const currentBrand = database.brands[0];
    const relatedProducts = database.products.filter((item) => item.brandId === currentBrand.id);
    const relatedAccounts = database.platformAccounts.filter((item) => item.brandId === currentBrand.id);
    const relatedTasks = database.tasks.filter((item) => item.brandId === currentBrand.id);
    const relatedMedia = database.media.filter((item) => item.brandId === currentBrand.id);
    const survey = database.surveyAnswers.filter((item) => item.brandId === currentBrand.id);
    const platformAccounts = database.platformAccounts.filter((item) => item.brandId === currentBrand.id);
    const competitorAccounts = database.competitorAccounts.filter((item) => item.brandId === currentBrand.id);
    const industryFeeds = database.assets.filter(
      (item) => item.brandId === currentBrand.id && item.category === "INDUSTRY_REPORT",
    );
    const businessAssets = database.assets.filter(
      (item) => item.brandId === currentBrand.id && item.category === "BUSINESS_DATA" && !this.isFeishuBindingMetadata(item.metadataJson),
    );

    return {
      currentBrand,
      summaryCards: [
        { label: "品牌档案数", value: database.brands.length, tone: "primary" },
        { label: "产品资料数", value: relatedProducts.length, tone: "violet" },
        { label: "平台账号数", value: relatedAccounts.length, tone: "green" },
        { label: "任务总数", value: relatedTasks.length, tone: "orange" },
        { label: "媒体资产数", value: relatedMedia.length, tone: "blue" },
      ],
      archiveSteps: this.buildStepsFromCollections({
        products: relatedProducts,
        survey,
        platformAccounts,
        competitorAccounts,
        industryFeeds,
        businessAssets,
      }),
    };
  }

  private async getOverviewFromDatabase() {
    const currentBrand = await this.prismaService.brand.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!currentBrand) {
      return this.getOverviewFromMock();
    }

    const [productsCount, platformAccountsCount, tasksCount, mediaCount] = await Promise.all([
      this.prismaService.product.count({ where: { brandId: currentBrand.id } }),
      this.prismaService.platformAccount.count({ where: { brandId: currentBrand.id } }),
      this.prismaService.task.count({ where: { brandId: currentBrand.id } }),
      this.prismaService.mediaAsset.count({ where: { brandId: currentBrand.id } }),
    ]);

    const archive = await this.getArchiveFromDatabase(currentBrand.id);

    return {
      currentBrand: archive.brand,
      summaryCards: [
        { label: "品牌档案数", value: await this.prismaService.brand.count(), tone: "primary" },
        { label: "产品资料数", value: productsCount, tone: "violet" },
        { label: "平台账号数", value: platformAccountsCount, tone: "green" },
        { label: "任务总数", value: tasksCount, tone: "orange" },
        { label: "媒体资产数", value: mediaCount, tone: "blue" },
      ],
      archiveSteps: archive.steps,
    };
  }

  private getArchiveFromMock(id: string) {
    const brand = this.getBrand(id);
    const products = database.products.filter((item) => item.brandId === id);
    const survey = database.surveyAnswers.filter((item) => item.brandId === id);
    const platformAccounts = database.platformAccounts.filter((item) => item.brandId === id);
    const competitorAccounts = database.competitorAccounts.filter((item) => item.brandId === id);
    const industryFeeds = database.assets.filter(
      (item) => item.brandId === id && item.category === "INDUSTRY_REPORT",
    );
    const businessAssets = database.assets.filter(
      (item) => item.brandId === id && item.category === "BUSINESS_DATA" && !this.isFeishuBindingMetadata(item.metadataJson),
    );

    return {
      brand,
      products,
      survey,
      platformAccounts,
      competitorAccounts,
      industryFeeds,
      businessAssets,
      steps: this.buildStepsFromCollections({
        products,
        survey,
        platformAccounts,
        competitorAccounts,
        industryFeeds,
        businessAssets,
      }),
      recentTasks: database.tasks.filter((item) => item.brandId === id).slice(0, 5),
      recentMedia: database.media.filter((item) => item.brandId === id).slice(0, 5),
    };
  }

  private listBrandMembersFromMock(id: string, currentUserId: string): BrandMemberListRecord {
    const brand = this.getBrand(id);
    if (brand.ownerUserId !== currentUserId) {
      throw new UnauthorizedException("当前账号无权查看该品牌成员");
    }

    const owner = database.users.find((item) => item.id === brand.ownerUserId);
    if (!owner) {
      throw new NotFoundException("品牌主账号不存在");
    }

    return {
      brandId: brand.id,
      brandName: brand.brandName,
      currentUserRole: "ADMIN",
      isCurrentUserOwner: true,
      canManageMembers: true,
      items: [
        {
          id: `mock_member_${brand.id}_${owner.id}`,
          userId: owner.id,
          nickname: owner.nickname || owner.mobile,
          mobile: owner.mobile,
          email: owner.email || "",
          role: "ADMIN",
          status: BrandMemberStatus.ACTIVE,
          joinedAt: new Date().toISOString(),
          isCurrentUser: true,
          isOwner: true,
        },
      ],
    };
  }

  private listBrandInvitesFromMock(id: string, currentUserId: string): BrandInviteListRecord {
    void id;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请流，请先连接数据库");
  }

  private listMyPendingBrandInvitesFromMock(currentUserId: string): PendingBrandInviteListRecord {
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请流，请先连接数据库");
  }

  private listMyBrandInviteHistoryFromMock(currentUserId: string): MyBrandInviteHistoryListRecord {
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请通知中心，请先连接数据库");
  }

  private createBrandInviteFromMock(id: string, payload: CreateBrandInvitePayload, currentUserId: string) {
    void id;
    void payload;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请流，请先连接数据库");
  }

  private acceptBrandInviteFromMock(inviteId: string, currentUserId: string) {
    void inviteId;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请流，请先连接数据库");
  }

  private acceptBrandInviteByCodeFromMock(payload: AcceptBrandInviteByCodePayload, currentUserId: string) {
    void payload;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请码，请先连接数据库");
  }

  private revokeBrandInviteFromMock(id: string, inviteId: string, currentUserId: string) {
    void id;
    void inviteId;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持邀请流，请先连接数据库");
  }

  private listBrandRoleAuditLogsFromMock(id: string, currentUserId: string): BrandRoleAuditLogRecord {
    void id;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持品牌成员审计日志，请先连接数据库");
  }

  private transferBrandOwnershipFromMock(id: string, payload: TransferBrandOwnerPayload, currentUserId: string) {
    void id;
    void payload;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持主账号转移，请先连接数据库");
  }

  private async buildBrandMemberListFromDatabase(id: string, currentUserId: string): Promise<BrandMemberListRecord> {
    await this.ensureBrandExistsInDatabase(id);
    const currentMembership = await this.requireBrandMembership(id, currentUserId);
    const members = await this.prismaService.brandMember.findMany({
      where: {
        brandId: id,
        status: {
          in: [BrandMemberStatus.ACTIVE, BrandMemberStatus.INVITED, BrandMemberStatus.DISABLED],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const sortedMembers = [...members].sort(
      (left, right) => compareBrandMemberRole(left.role, right.role) || left.joinedAt.getTime() - right.joinedAt.getTime(),
    );

    return {
      brandId: currentMembership.brand.id,
      brandName: currentMembership.brand.brandName,
      currentUserRole: normalizeBrandCollaboratorRole(currentMembership.role),
      isCurrentUserOwner: currentMembership.role === BrandMemberRole.OWNER,
      canManageMembers: canManageBrandMembers(currentMembership.role),
      items: sortedMembers
        .map((item) => ({
          id: item.id,
          userId: item.user.id,
          nickname: item.user.nickname ?? item.user.mobile,
          mobile: item.user.mobile,
          email: item.user.email ?? "",
          role: normalizeBrandCollaboratorRole(item.role),
          status: item.status,
          joinedAt: item.joinedAt.toISOString(),
          isCurrentUser: item.user.id === currentUserId,
          isOwner: item.role === BrandMemberRole.OWNER,
        }))
      ,
    };
  }

  private async buildBrandInviteListFromDatabase(id: string): Promise<BrandInviteListRecord> {
    await this.ensureBrandExistsInDatabase(id);
    const brand = await this.prismaService.brand.findUnique({
      where: { id },
      select: {
        id: true,
        brandName: true,
      },
    });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const now = new Date();
    const expiredInviteIds = await this.prismaService.brandInvite.findMany({
      where: {
        brandId: id,
        status: BrandInviteStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
      },
    });
    if (expiredInviteIds.length) {
      await this.prismaService.brandInvite.updateMany({
        where: {
          id: {
            in: expiredInviteIds.map((item) => item.id),
          },
        },
        data: {
          status: BrandInviteStatus.EXPIRED,
        },
      });
    }

    const invites = await this.prismaService.brandInvite.findMany({
      where: {
        brandId: id,
        status: {
          in: [BrandInviteStatus.PENDING, BrandInviteStatus.REVOKED, BrandInviteStatus.EXPIRED],
        },
      },
      include: {
        inviteeUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
            email: true,
          },
        },
        invitedByUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return {
      brandId: brand.id,
      brandName: brand.brandName,
      items: invites.map((item) => this.mapBrandInviteListItem(item)),
    };
  }

  private async buildBrandPermissionSettingsFromDatabase(id: string, currentUserId: string): Promise<BrandPermissionSettingsRecord> {
    const currentMembership = await this.prismaService.brandMember.findFirst({
      where: {
        brandId: id,
        userId: currentUserId,
        status: BrandMemberStatus.ACTIVE,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
            ownerUserId: true,
            memberPermissionsJson: true,
          },
        },
      },
    });
    if (!currentMembership) {
      throw new UnauthorizedException("当前账号无权查看该品牌权限");
    }

    const permissionConfig = normalizeBrandPermissionConfig(currentMembership.brand.memberPermissionsJson);
    return {
      brandId: currentMembership.brand.id,
      brandName: currentMembership.brand.brandName,
      currentUserRole: normalizeBrandCollaboratorRole(currentMembership.role),
      isCurrentUserOwner: currentMembership.brand.ownerUserId === currentUserId,
      canManageMembers: canManageBrandMembers(currentMembership.role),
      canManagePermissions: normalizeBrandCollaboratorRole(currentMembership.role) === "ADMIN",
      permissionConfig,
      currentUserPermissions: getBrandRolePermissionMap(currentMembership.role, permissionConfig),
      permissionTree: BRAND_PERMISSION_TREE,
    };
  }

  private async buildBrandRoleAuditLogsFromDatabase(id: string): Promise<BrandRoleAuditLogRecord> {
    await this.ensureBrandExistsInDatabase(id);
    const brand = await this.prismaService.brand.findUnique({
      where: { id },
      select: {
        id: true,
        brandName: true,
      },
    });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const items = await this.prismaService.brandRoleAuditLog.findMany({
      where: {
        brandId: id,
      },
      include: {
        operatorUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    });

    return {
      brandId: brand.id,
      brandName: brand.brandName,
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        summary: item.summary,
        operatorUserId: item.operatorUser.id,
        operatorName: item.operatorUser.nickname ?? item.operatorUser.mobile,
        targetUserId: item.targetUser?.id ?? undefined,
        targetUserName: item.targetUser ? item.targetUser.nickname ?? item.targetUser.mobile : undefined,
        targetInviteId: item.targetInviteId ?? undefined,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  private async acceptBrandInviteInternal(
    invite: {
      id: string;
      brandId: string;
      inviteeUserId: string | null;
      inviteAccount: string;
      inviteCode: string;
      role: BrandMemberRole;
      status: BrandInviteStatus;
      invitedByUserId: string;
      expiresAt: Date | null;
      brand: {
        id: string;
        brandName: string;
      };
    },
    currentUserId: string,
  ) {
    const now = new Date();
    if (invite.status !== BrandInviteStatus.PENDING) {
      throw new ServiceUnavailableException("当前邀请已不可接受");
    }
    if (invite.expiresAt && invite.expiresAt < now) {
      await this.prismaService.brandInvite.update({
        where: { id: invite.id },
        data: {
          status: BrandInviteStatus.EXPIRED,
        },
      });
      throw new ServiceUnavailableException("当前邀请已过期");
    }
    if (invite.inviteeUserId && invite.inviteeUserId !== currentUserId) {
      throw new UnauthorizedException("当前账号无权接受此邀请");
    }

    const currentUser = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        mobile: true,
        email: true,
        nickname: true,
      },
    });
    if (!currentUser) {
      throw new UnauthorizedException("当前用户不存在");
    }

    if (
      invite.inviteeUserId == null &&
      invite.inviteAccount &&
      ![currentUser.id, currentUser.mobile, currentUser.email ?? "", currentUser.nickname ?? ""]
        .filter(Boolean)
        .includes(invite.inviteAccount)
    ) {
      throw new UnauthorizedException("当前账号与邀请记录不匹配");
    }

    await this.prismaService.$transaction(async (tx) => {
      if (invite.role !== BrandMemberRole.OWNER) {
        await tx.brandMember.updateMany({
          where: {
            userId: currentUserId,
            brandId: {
              not: invite.brandId,
            },
            role: {
              not: BrandMemberRole.OWNER,
            },
            status: BrandMemberStatus.ACTIVE,
          },
          data: {
            status: BrandMemberStatus.REMOVED,
          },
        });
      }

      await tx.brandMember.upsert({
        where: {
          brandId_userId: {
            brandId: invite.brandId,
            userId: currentUserId,
          },
        },
        update: {
          role: invite.role,
          status: BrandMemberStatus.ACTIVE,
          invitedByUserId: invite.invitedByUserId,
        },
        create: {
          brandId: invite.brandId,
          userId: currentUserId,
          role: invite.role,
          status: BrandMemberStatus.ACTIVE,
          invitedByUserId: invite.invitedByUserId,
        },
      });

      await tx.brandInvite.update({
        where: { id: invite.id },
        data: {
          inviteeUserId: currentUserId,
          status: BrandInviteStatus.ACCEPTED,
          acceptedAt: now,
        },
      });

      await tx.brandInviteReadState.upsert({
        where: {
          inviteId_userId: {
            inviteId: invite.id,
            userId: currentUserId,
          },
        },
        create: {
          inviteId: invite.id,
          userId: currentUserId,
          readAt: now,
        },
        update: {
          readAt: now,
        },
      });

      await this.syncBrandInviteNotificationByInviteId(tx, invite.id, currentUserId, now);

      await this.logBrandRoleAudit(tx, {
        brandId: invite.brandId,
        operatorUserId: currentUserId,
        targetUserId: currentUserId,
        targetInviteId: invite.id,
        action: "INVITE_ACCEPTED",
        summary: `接受品牌邀请：${invite.inviteAccount || "邀请链接"}`,
        detailJson: {
          inviteCode: invite.inviteCode,
          acceptedAt: now.toISOString(),
          role: invite.role,
        },
      });
    });

    return {
      brandId: invite.brand.id,
      brandName: invite.brand.brandName,
      accepted: true,
    };
  }

  private mapBrandInviteListItem(item: {
    id: string;
    inviteAccount: string;
    inviteCode: string;
    inviteeUser?: { id: string; nickname: string | null; mobile: string; email: string | null } | null;
    role: BrandMemberRole;
    status: BrandInviteStatus;
    note: string | null;
    invitedByUser: { id: string; nickname: string | null; mobile: string };
    expiresAt: Date | null;
    createdAt: Date;
    revokedAt: Date | null;
    readStates?: Array<{ userId: string; readAt: Date }>;
  }, options?: { currentUserId?: string }): BrandInviteListItem {
    const readState = options?.currentUserId
      ? item.readStates?.find((readItem) => readItem.userId === options.currentUserId)
      : undefined;

    return {
      id: item.id,
      inviteAccount: item.inviteAccount || "邀请链接",
      inviteCode: item.inviteCode,
      inviteLink: this.buildInviteLink(item.inviteCode),
      inviteeUserId: item.inviteeUser?.id,
      inviteeNickname: item.inviteeUser?.nickname ?? undefined,
      inviteeMobile: item.inviteeUser?.mobile ?? undefined,
      inviteeEmail: item.inviteeUser?.email ?? undefined,
      role: normalizeBrandCollaboratorRole(item.role),
      status: item.status,
      note: item.note ?? undefined,
      invitedByUserId: item.invitedByUser.id,
      invitedByName: item.invitedByUser.nickname ?? item.invitedByUser.mobile,
      expiresAt: item.expiresAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      revokedAt: item.revokedAt?.toISOString(),
      isMatchedUser: Boolean(item.inviteeUser?.id),
      isRead: Boolean(readState),
      readAt: readState?.readAt.toISOString(),
    };
  }

  private buildInviteLink(inviteCode: string) {
    return `${this.getWebBaseUrl()}/personal-center/team?inviteCode=${encodeURIComponent(inviteCode)}`;
  }

  private getWebBaseUrl() {
    return process.env.WEB_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "http://localhost:3001";
  }

  private generateInviteCode() {
    return `BR${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  }

  private async logBrandRoleAudit(
    tx: Prisma.TransactionClient | PrismaService,
    payload: {
      brandId: string;
      operatorUserId: string;
      targetUserId?: string;
      targetInviteId?: string;
      action: string;
      summary: string;
      detailJson?: Prisma.JsonObject;
    },
  ) {
    await tx.brandRoleAuditLog.create({
      data: {
        brandId: payload.brandId,
        operatorUserId: payload.operatorUserId,
        targetUserId: payload.targetUserId,
        targetInviteId: payload.targetInviteId,
        action: payload.action,
        summary: payload.summary,
        detailJson: payload.detailJson,
      },
    });
  }

  private async syncBrandInviteNotificationsForUser(
    currentUserId: string,
    invites?: Array<{
      id: string;
      brandId: string;
      inviteAccount: string;
      inviteCode: string;
      inviteeUser?: { id: string; nickname: string | null; mobile: string; email: string | null } | null;
      role: BrandMemberRole;
      status: BrandInviteStatus;
      note: string | null;
      invitedByUser: { id: string; nickname: string | null; mobile: string };
      expiresAt: Date | null;
      createdAt: Date;
      revokedAt: Date | null;
      acceptedAt?: Date | null;
      brand: { id: string; brandName: string };
      readStates?: Array<{ userId: string; readAt: Date }>;
    }>,
  ) {
    const inviteItems = invites ?? (await this.loadMatchedBrandInvitesForUser(currentUserId));
    for (const invite of inviteItems) {
      await this.upsertBrandInviteNotification(this.prismaService, {
        invite,
        userId: currentUserId,
        readAt: invite.readStates?.[0]?.readAt,
      });
    }
  }

  private async syncBrandInviteNotificationByInviteId(
    tx: Prisma.TransactionClient | PrismaService,
    inviteId: string,
    userId: string,
    readAt?: Date,
  ) {
    const invite = await tx.brandInvite.findFirst({
      where: {
        id: inviteId,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
        inviteeUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
            email: true,
          },
        },
        invitedByUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
        readStates: {
          where: {
            userId,
          },
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
    });
    if (!invite) {
      return;
    }

    await this.upsertBrandInviteNotification(tx, {
      invite,
      userId,
      readAt: readAt ?? invite.readStates[0]?.readAt,
    });
  }

  private async upsertBrandInviteNotification(
    tx: Prisma.TransactionClient | PrismaService,
    payload: {
      invite: {
        id: string;
        brandId: string;
        inviteAccount: string;
        inviteCode: string;
        inviteeUser?: { id: string; nickname: string | null; mobile: string; email: string | null } | null;
        role: BrandMemberRole;
        status: BrandInviteStatus;
        note: string | null;
        invitedByUser: { id: string; nickname: string | null; mobile: string };
        expiresAt: Date | null;
        createdAt: Date;
        revokedAt: Date | null;
        acceptedAt?: Date | null;
        brand: { id: string; brandName: string };
      };
      userId: string;
      readAt?: Date;
    },
  ) {
    await tx.brandInviteNotification.upsert({
      where: {
        inviteId_userId: {
          inviteId: payload.invite.id,
          userId: payload.userId,
        },
      },
      create: {
        inviteId: payload.invite.id,
        userId: payload.userId,
        brandId: payload.invite.brand.id,
        title: this.buildBrandInviteNotificationTitle(payload.invite),
        summary: this.buildBrandInviteNotificationSummary(payload.invite),
        actionUrl: "/personal-center/invites",
        readAt: payload.readAt,
      },
      update: {
        brandId: payload.invite.brand.id,
        title: this.buildBrandInviteNotificationTitle(payload.invite),
        summary: this.buildBrandInviteNotificationSummary(payload.invite),
        actionUrl: "/personal-center/invites",
        readAt: payload.readAt ?? null,
      },
    });
  }

  private async loadMatchedBrandInvitesForUser(currentUserId: string) {
    const currentUser = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        mobile: true,
        email: true,
        nickname: true,
      },
    });
    if (!currentUser) {
      throw new UnauthorizedException("当前用户不存在");
    }

    const now = new Date();
    await this.prismaService.brandInvite.updateMany({
      where: {
        status: BrandInviteStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: BrandInviteStatus.EXPIRED,
      },
    });

    const accountCandidates = this.buildInviteAccountCandidates(currentUser);
    return this.prismaService.brandInvite.findMany({
      where: {
        status: {
          in: [
            BrandInviteStatus.PENDING,
            BrandInviteStatus.ACCEPTED,
            BrandInviteStatus.EXPIRED,
            BrandInviteStatus.REVOKED,
          ],
        },
        OR: [{ inviteeUserId: currentUserId }, ...accountCandidates.map((item) => ({ inviteAccount: item }))],
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
        inviteeUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
            email: true,
          },
        },
        invitedByUser: {
          select: {
            id: true,
            nickname: true,
            mobile: true,
          },
        },
        readStates: {
          where: {
            userId: currentUserId,
          },
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  private buildBrandInviteNotificationTitle(invite: {
    brand: { brandName: string };
    status: BrandInviteStatus;
  }) {
    if (invite.status === BrandInviteStatus.ACCEPTED) {
      return `你已加入 ${invite.brand.brandName}`;
    }
    if (invite.status === BrandInviteStatus.REVOKED) {
      return `${invite.brand.brandName} 的品牌邀请已撤回`;
    }
    if (invite.status === BrandInviteStatus.EXPIRED) {
      return `${invite.brand.brandName} 的品牌邀请已过期`;
    }
    return `${invite.brand.brandName} 邀请你加入品牌`;
  }

  private buildBrandInviteNotificationSummary(invite: {
    brand: { brandName: string };
    role: BrandMemberRole;
    status: BrandInviteStatus;
    invitedByUser: { nickname: string | null; mobile: string };
  }) {
    const inviterName = invite.invitedByUser.nickname ?? invite.invitedByUser.mobile;
    const inviteRole = normalizeBrandCollaboratorRole(invite.role);
    if (invite.status === BrandInviteStatus.ACCEPTED) {
      return `你已接受 ${invite.brand.brandName} 的 ${inviteRole} 邀请，邀请人：${inviterName}`;
    }
    if (invite.status === BrandInviteStatus.REVOKED) {
      return `原邀请角色：${inviteRole}，邀请人：${inviterName}`;
    }
    if (invite.status === BrandInviteStatus.EXPIRED) {
      return `原邀请角色：${inviteRole}，邀请人：${inviterName}`;
    }
    return `邀请角色：${inviteRole}，邀请人：${inviterName}`;
  }

  private buildInviteAccountCandidates(user: {
    id: string;
    mobile: string;
    email: string | null;
    nickname: string | null;
  }) {
    return [user.id, user.mobile, user.email ?? "", user.nickname ?? ""].filter(Boolean);
  }

  private async requireBrandMembership(id: string, userId: string) {
    const membership = await this.prismaService.brandMember.findFirst({
      where: {
        brandId: id,
        userId,
        status: BrandMemberStatus.ACTIVE,
      },
      include: {
        brand: {
          select: {
            id: true,
            brandName: true,
          },
        },
      },
    });
    if (!membership) {
      throw new UnauthorizedException("当前账号无权查看该品牌成员");
    }
    return membership;
  }

  private async requireBrandMemberManager(id: string, userId: string) {
    const membership = await this.requireBrandMembership(id, userId);
    if (!canManageBrandMembers(membership.role)) {
      throw new UnauthorizedException("当前角色无权管理品牌成员");
    }
    return membership;
  }

  private async requireBrandAdmin(id: string, userId: string) {
    const membership = await this.requireBrandMembership(id, userId);
    if (normalizeBrandCollaboratorRole(membership.role) !== "ADMIN") {
      throw new UnauthorizedException("只有管理员可以管理团队成员和权限");
    }
    return membership;
  }

  private async requireBrandOwner(id: string, userId: string) {
    const membership = await this.requireBrandMembership(id, userId);
    if (membership.role !== BrandMemberRole.OWNER) {
      throw new UnauthorizedException("只有主账号可以管理团队成员和邀请");
    }
    return membership;
  }

  private async createBrandInviteRecord(
    brandId: string,
    payload: {
      inviteAccount: string;
      inviteeUserId?: string;
      role: BrandMemberRole;
      note?: string;
      expiresInDays?: number;
      invitedByUserId: string;
      auditSummary: string;
      auditAction: string;
    },
  ) {
    if (payload.inviteeUserId) {
      const existingMember = await this.prismaService.brandMember.findFirst({
        where: {
          brandId,
          userId: payload.inviteeUserId,
          status: {
            in: [BrandMemberStatus.ACTIVE, BrandMemberStatus.INVITED, BrandMemberStatus.DISABLED],
          },
        },
        select: { id: true },
      });
      if (existingMember) {
        throw new ServiceUnavailableException("该账号已在当前品牌中，请直接在成员列表中管理");
      }
    }

    const duplicateInviteConditions = [
      ...(payload.inviteAccount ? [{ inviteAccount: payload.inviteAccount }] : []),
      ...(payload.inviteeUserId ? [{ inviteeUserId: payload.inviteeUserId }] : []),
    ];
    if (duplicateInviteConditions.length) {
      const duplicateInvite = await this.prismaService.brandInvite.findFirst({
        where: {
          brandId,
          status: BrandInviteStatus.PENDING,
          OR: duplicateInviteConditions,
        },
        select: { id: true },
      });
      if (duplicateInvite) {
        throw new ServiceUnavailableException("该账号已存在待处理邀请，请勿重复创建");
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + normalizeInviteExpiryDays(payload.expiresInDays));
    const inviteCode = this.generateInviteCode();

    await this.prismaService.$transaction(async (tx) => {
      const createdInvite = await tx.brandInvite.create({
        data: {
          brandId,
          inviteeUserId: payload.inviteeUserId,
          inviteAccount: payload.inviteAccount,
          inviteCode,
          role: payload.role,
          status: BrandInviteStatus.PENDING,
          note: payload.note?.trim() || undefined,
          invitedByUserId: payload.invitedByUserId,
          expiresAt,
        },
      });

      await this.logBrandRoleAudit(tx, {
        brandId,
        operatorUserId: payload.invitedByUserId,
        targetInviteId: createdInvite.id,
        targetUserId: payload.inviteeUserId,
        action: payload.auditAction,
        summary: payload.auditSummary,
        detailJson: {
          inviteAccount: payload.inviteAccount || "邀请链接",
          inviteCode,
          role: payload.role,
          expiresAt: expiresAt.toISOString(),
        },
      });

      if (payload.inviteeUserId) {
        await this.syncBrandInviteNotificationByInviteId(tx, createdInvite.id, payload.inviteeUserId);
      }
    });
  }

  private addBrandMemberFromMock(id: string, payload: AddBrandMemberPayload, currentUserId: string) {
    void id;
    void payload;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持成员管理，请先连接数据库");
  }

  private updateBrandMemberFromMock(id: string, memberId: string, payload: UpdateBrandMemberPayload, currentUserId: string) {
    void id;
    void memberId;
    void payload;
    void currentUserId;
    throw new ServiceUnavailableException("当前 mock 模式暂不支持成员管理，请先连接数据库");
  }

  private assertCanAssignBrandRole(managerRole: BrandMemberRole, targetRole: BrandMemberRole) {
    if (normalizeBrandCollaboratorRole(managerRole) === "ADMIN" && targetRole !== BrandMemberRole.OWNER) {
      return;
    }
    throw new UnauthorizedException("当前角色无权管理品牌成员");
  }

  private assertCanManageTargetMember(managerRole: BrandMemberRole, targetRole: BrandMemberRole) {
    if (normalizeBrandCollaboratorRole(managerRole) === "ADMIN") {
      if (targetRole === BrandMemberRole.OWNER) {
        throw new UnauthorizedException("当前角色无权修改该成员");
      }
      return;
    }
    throw new UnauthorizedException("当前角色无权管理品牌成员");
  }

  private getBrandPermissionSettingsFromMock(id: string, currentUserId: string): BrandPermissionSettingsRecord {
    const brand = this.getBrand(id);
    if (brand.ownerUserId !== currentUserId) {
      throw new UnauthorizedException("当前账号无权查看该品牌权限");
    }

    const permissionConfig = buildDefaultBrandPermissionConfig();
    return {
      brandId: brand.id,
      brandName: brand.brandName,
      currentUserRole: "ADMIN",
      isCurrentUserOwner: true,
      canManageMembers: true,
      canManagePermissions: true,
      permissionConfig,
      currentUserPermissions: getBrandRolePermissionMap("ADMIN", permissionConfig),
      permissionTree: BRAND_PERMISSION_TREE,
    };
  }

  private async getArchiveFromDatabase(id: string) {
    const brand = await this.prismaService.brand.findUnique({
      where: { id },
      include: {
        products: true,
        surveys: {
          where: { surveyType: "BRAND_ARCHIVE" },
          take: 1,
        },
        platformAccounts: true,
        competitorAccounts: true,
        industryReports: true,
        businessAssets: {
          where: { category: AssetCategory.BUSINESS_DATA },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const survey = this.parseSurveyAnswers(brand.surveys[0]?.surveyJson);
    const products = brand.products.map((item) => this.mapProduct(item));
    const platformAccounts = brand.platformAccounts.map((item) => this.mapAccount(item));
    const competitorAccounts = brand.competitorAccounts.map((item) => this.mapAccount(item));
    const industryFeeds = brand.industryReports.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.summary ?? "",
      sourceName: item.sourceName ?? "",
      fileUrl: item.fileUrl ?? "",
    }));
    const businessAssets = brand.businessAssets
      .filter((item) => !this.isFeishuBindingMetadata(item.metadataJson))
      .map((item) => {
        const metadata = this.readBusinessAssetMetadata(item.metadataJson);
        return {
          id: item.id,
          title: item.title,
          description: item.description ?? "",
          sourceName: metadata.sourceName || "",
          fileUrl: item.fileUrl ?? "",
          knowledgeBaseId: metadata.knowledgeBaseId,
          knowledgeBaseName: metadata.knowledgeBaseName,
          knowledgeBaseSlug: metadata.knowledgeBaseSlug,
          bindingType: metadata.bindingType,
          targetId: metadata.targetId,
          targetKey: metadata.targetKey,
          targetName: metadata.targetName,
          priority: metadata.priority,
          retrievalMode: metadata.retrievalMode,
          isRequired: metadata.isRequired,
          enabled: metadata.enabled,
          defaultTopK: metadata.defaultTopK,
          recallMode: metadata.recallMode,
          rerankEnabled: metadata.rerankEnabled,
          retrievalThreshold: metadata.retrievalThreshold,
        };
      });

    return {
      brand: {
        id: brand.id,
        brandName: brand.brandName,
        industry: brand.industry ?? "",
        storeCount: brand.storeCount ?? 0,
        foundedYear: brand.foundedYear ?? 0,
        brandDescription: brand.brandDescription ?? "",
        enterpriseIntro: brand.enterpriseIntro ?? "",
      },
      products,
      survey,
      platformAccounts,
      competitorAccounts,
      industryFeeds,
      businessAssets,
      steps: this.buildStepsFromCollections({
        products,
        survey,
        platformAccounts,
        competitorAccounts,
        industryFeeds,
        businessAssets,
      }),
      recentTasks: [],
      recentMedia: [],
    };
  }

  private createBrandFromMock(payload: CreateBrandPayload) {
    const brand = {
      id: createId("br"),
      ownerUserId: payload.ownerUserId ?? database.users[0].id,
      brandName: payload.brandName,
      industry: payload.industry ?? "待补充",
      storeCount: payload.storeCount ?? 0,
      foundedYear: payload.foundedYear ?? new Date().getFullYear(),
      brandDescription: payload.brandDescription ?? "",
      enterpriseIntro: payload.enterpriseIntro ?? "",
    };

    database.brands.unshift(brand);
    return brand;
  }

  private updateBackgroundFromMock(id: string, payload: UpdateBackgroundPayload) {
    const brand = this.getBrand(id);

    Object.assign(brand, {
      brandName: payload.brandName ?? brand.brandName,
      industry: payload.industry ?? brand.industry,
      storeCount: payload.storeCount ?? brand.storeCount,
      foundedYear: payload.foundedYear ?? brand.foundedYear,
      brandDescription: payload.brandDescription ?? brand.brandDescription,
      enterpriseIntro: payload.enterpriseIntro ?? brand.enterpriseIntro,
    });

    return brand;
  }

  private createProductFromMock(id: string, payload: CreateProductPayload) {
    this.getBrand(id);

    const product = {
      id: createId("prd"),
      brandId: id,
      productName: payload.productName,
      productType: payload.productType ?? "待补充",
      price: payload.price ?? 0,
      productPositioning: payload.productPositioning ?? "",
      targetAudience: payload.targetAudience ?? "",
      painPoint: payload.painPoint ?? "",
      usageScenario: payload.usageScenario ?? "",
      differentiators: payload.differentiators ?? "",
      marketPosition: payload.marketPosition ?? "",
      detailDescription: payload.detailDescription ?? "",
      imageUrl: payload.imageUrl ?? "",
    };

    database.products.unshift(product);
    return product;
  }

  private updateProductFromMock(id: string, productId: string, payload: UpdateProductPayload) {
    this.getBrand(id);
    const product = database.products.find((item) => item.id === productId && item.brandId === id);

    if (!product) {
      throw new NotFoundException("产品不存在");
    }

    Object.assign(product, {
      productName: payload.productName ?? product.productName,
      productType: payload.productType ?? product.productType,
      price: payload.price ?? product.price,
      productPositioning: payload.productPositioning ?? product.productPositioning,
      targetAudience: payload.targetAudience ?? product.targetAudience,
      painPoint: payload.painPoint ?? product.painPoint,
      usageScenario: payload.usageScenario ?? product.usageScenario,
      differentiators: payload.differentiators ?? product.differentiators,
      marketPosition: payload.marketPosition ?? product.marketPosition,
      detailDescription: payload.detailDescription ?? product.detailDescription,
      imageUrl: payload.imageUrl ?? product.imageUrl,
    });

    return product;
  }

  private deleteProductFromMock(id: string, productId: string) {
    this.getBrand(id);
    const index = database.products.findIndex((item) => item.id === productId && item.brandId === id);

    if (index < 0) {
      throw new NotFoundException("产品不存在");
    }

    const [removed] = database.products.splice(index, 1);
    return removed;
  }

  private upsertSurveyFromMock(id: string, payload: UpsertSurveyPayload) {
    this.getBrand(id);
    database.surveyAnswers = database.surveyAnswers.filter((item) => item.brandId !== id);

    const rows = payload.answers.map((answer) => ({
      id: createId("sur"),
      brandId: id,
      key: answer.key,
      label: answer.label,
      value: answer.value,
    }));

    database.surveyAnswers.unshift(...rows);
    return rows;
  }

  private replacePlatformAccountsFromMock(id: string, payload: ReplaceAccountsPayload) {
    return this.replaceAccounts("platformAccounts", id, payload.accounts);
  }

  private replaceCompetitorAccountsFromMock(id: string, payload: ReplaceAccountsPayload) {
    return this.replaceAccounts("competitorAccounts", id, payload.accounts);
  }

  private replaceIndustryFeedsFromMock(id: string, payload: CreateAssetPayload) {
    return this.replaceAssets(id, "INDUSTRY_REPORT", payload.items);
  }

  private replaceBusinessAssetsFromMock(id: string, payload: CreateAssetPayload) {
    const rows = this.replaceAssets(id, "BUSINESS_DATA", payload.items);
    this.syncBusinessAssetsToKnowledgeBaseFromMock(id, payload.items);
    return rows;
  }

  private async canUseKnowledgeBridgeStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }

    try {
      const rows = await this.prismaService.$queryRawUnsafe<
        Array<{
          knowledgeBase: string | null;
          knowledgeBaseFile: string | null;
          knowledgeBinding: string | null;
          knowledgeRetrievalConfig: string | null;
        }>
      >(
        `SELECT
          to_regclass('"KnowledgeBase"')::text AS "knowledgeBase",
          to_regclass('"KnowledgeBaseFile"')::text AS "knowledgeBaseFile",
          to_regclass('"KnowledgeBinding"')::text AS "knowledgeBinding",
          to_regclass('"KnowledgeRetrievalConfig"')::text AS "knowledgeRetrievalConfig"`,
      );
      return Boolean(
        rows[0]?.knowledgeBase
        && rows[0]?.knowledgeBaseFile
        && rows[0]?.knowledgeBinding
        && rows[0]?.knowledgeRetrievalConfig,
      );
    } catch {
      return false;
    }
  }

  private buildBusinessAssetsKnowledgeBaseId(brandId: string, knowledgeSpaceSlug?: string) {
    const normalizedSlug = this.sanitizeKnowledgeSpaceSlug(knowledgeSpaceSlug);
    return normalizedSlug ? `${BRAND_BUSINESS_ASSETS_KB_PREFIX}${brandId}__${normalizedSlug}` : `${BRAND_BUSINESS_ASSETS_KB_PREFIX}${brandId}`;
  }

  private buildBusinessAssetsKnowledgeBaseSlug(brandId: string, knowledgeSpaceSlug?: string) {
    const normalizedSlug = this.sanitizeKnowledgeSpaceSlug(knowledgeSpaceSlug);
    return normalizedSlug ? `${BRAND_BUSINESS_ASSETS_SLUG_PREFIX}${brandId}-${normalizedSlug}` : `${BRAND_BUSINESS_ASSETS_SLUG_PREFIX}${brandId}`;
  }

  private buildBusinessAssetsKnowledgeBaseName(brandName: string, knowledgeSpaceName?: string) {
    const normalizedName = String(knowledgeSpaceName || "").trim();
    return normalizedName || `${brandName}企业知识库`;
  }

  private sanitizeKnowledgeSpaceSlug(value?: string) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  private buildBusinessAssetMetadata(item: CreateAssetPayload["items"][number]): Prisma.InputJsonValue {
    const metadata: BusinessAssetKnowledgeMetadata = {
      sourceName: String(item.sourceName || "").trim(),
      storedFileName: this.extractBrandAssetStoredFileName(item.fileUrl),
      knowledgeBaseId: String(item.knowledgeBaseId || "").trim() || undefined,
      knowledgeBaseName: String(item.knowledgeBaseName || "").trim() || undefined,
      knowledgeBaseSlug: this.sanitizeKnowledgeSpaceSlug(item.knowledgeBaseSlug || item.knowledgeBaseName) || undefined,
      bindingType: item.bindingType,
      targetId: String(item.targetId || "").trim() || undefined,
      targetKey: String(item.targetKey || "").trim() || undefined,
      targetName: String(item.targetName || "").trim() || undefined,
      priority: typeof item.priority === "number" ? item.priority : undefined,
      retrievalMode: item.retrievalMode,
      isRequired: typeof item.isRequired === "boolean" ? item.isRequired : undefined,
      enabled: typeof item.enabled === "boolean" ? item.enabled : undefined,
      defaultTopK: typeof item.defaultTopK === "number" ? item.defaultTopK : undefined,
      recallMode: item.recallMode,
      rerankEnabled: typeof item.rerankEnabled === "boolean" ? item.rerankEnabled : undefined,
      retrievalThreshold: typeof item.retrievalThreshold === "number" ? item.retrievalThreshold : undefined,
    };
    return metadata as Prisma.InputJsonValue;
  }

  private readBusinessAssetMetadata(value: Prisma.JsonValue | null | undefined): BusinessAssetKnowledgeMetadata {
    const metadata = this.readObject(value);
    return {
      sourceName: this.readString(metadata, "sourceName"),
      storedFileName: this.readString(metadata, "storedFileName"),
      knowledgeBaseId: this.readString(metadata, "knowledgeBaseId"),
      knowledgeBaseName: this.readString(metadata, "knowledgeBaseName"),
      knowledgeBaseSlug: this.readString(metadata, "knowledgeBaseSlug"),
      bindingType: this.readString(metadata, "bindingType") as BusinessAssetKnowledgeMetadata["bindingType"] | undefined,
      targetId: this.readString(metadata, "targetId"),
      targetKey: this.readString(metadata, "targetKey"),
      targetName: this.readString(metadata, "targetName"),
      priority: typeof metadata.priority === "number" ? metadata.priority : undefined,
      retrievalMode: this.readString(metadata, "retrievalMode") as BusinessAssetKnowledgeMetadata["retrievalMode"] | undefined,
      isRequired: typeof metadata.isRequired === "boolean" ? metadata.isRequired : undefined,
      enabled: typeof metadata.enabled === "boolean" ? metadata.enabled : undefined,
      defaultTopK: typeof metadata.defaultTopK === "number" ? metadata.defaultTopK : undefined,
      recallMode: this.readString(metadata, "recallMode") as BusinessAssetKnowledgeMetadata["recallMode"] | undefined,
      rerankEnabled: typeof metadata.rerankEnabled === "boolean" ? metadata.rerankEnabled : undefined,
      retrievalThreshold: typeof metadata.retrievalThreshold === "number" ? metadata.retrievalThreshold : undefined,
    };
  }

  private buildDefaultManagedKnowledgeBinding(): ManagedKnowledgeBindingInput {
    return {
      bindingType: "MODULE",
      targetId: BRAND_GROWTH_KNOWLEDGE_TARGET_ID,
      targetKey: BRAND_GROWTH_KNOWLEDGE_TARGET_ID,
      targetName: BRAND_GROWTH_KNOWLEDGE_TARGET_NAME,
      priority: 1,
      retrievalMode: "HYBRID",
      isRequired: false,
      enabled: true,
    };
  }

  private buildManagedKnowledgeBaseDescription(brandName: string, knowledgeBaseName: string) {
    return `由前端“企业知识库”页面自动同步，当前对应品牌：${brandName}；知识库容器：${knowledgeBaseName}。`;
  }

  private collectManagedKnowledgeSpaceGroups(
    brandId: string,
    brandName: string,
    items: CreateAssetPayload["items"],
  ): ManagedKnowledgeSpaceGroup[] {
    const groups = new Map<string, ManagedKnowledgeSpaceGroup>();

    for (const item of items) {
      const metadata = this.readBusinessAssetMetadata(this.buildBusinessAssetMetadata(item) as Prisma.JsonValue);
      const knowledgeSpaceSlug = this.sanitizeKnowledgeSpaceSlug(metadata.knowledgeBaseSlug || metadata.knowledgeBaseName);
      const knowledgeBaseId = String(metadata.knowledgeBaseId || "").trim()
        || this.buildBusinessAssetsKnowledgeBaseId(brandId, knowledgeSpaceSlug);
      const knowledgeBaseName = this.buildBusinessAssetsKnowledgeBaseName(brandName, metadata.knowledgeBaseName);
      const knowledgeBaseSlug = this.buildBusinessAssetsKnowledgeBaseSlug(brandId, knowledgeSpaceSlug);
      const nextDefaultTopK = Math.max(1, Math.min(20, Math.floor(metadata.defaultTopK || 8)));
      const retrievalConfig = {
        defaultTopK: nextDefaultTopK,
        recallMode: metadata.recallMode || "HYBRID",
        rerankEnabled: Boolean(metadata.rerankEnabled),
        retrievalThreshold:
          typeof metadata.retrievalThreshold === "number" && Number.isFinite(metadata.retrievalThreshold)
            ? metadata.retrievalThreshold
            : undefined,
      } satisfies ManagedKnowledgeSpaceGroup["retrievalConfig"];
      const binding =
        metadata.bindingType && metadata.targetId
          ? {
              bindingType: metadata.bindingType,
              targetId: metadata.targetId,
              targetKey: metadata.targetKey || metadata.targetId,
              targetName: metadata.targetName || metadata.targetId,
              priority: Math.max(1, Math.floor(metadata.priority || 100)),
              retrievalMode: metadata.retrievalMode || "HYBRID",
              isRequired: Boolean(metadata.isRequired),
              enabled: metadata.enabled ?? true,
            } satisfies ManagedKnowledgeBindingInput
          : null;

      const existing = groups.get(knowledgeBaseId);
      if (existing) {
        existing.files.push({
          ...item,
          knowledgeBaseId,
          knowledgeBaseName,
          knowledgeBaseSlug,
        });
        if (!existing.retrievalConfig && retrievalConfig) {
          existing.retrievalConfig = retrievalConfig;
        }
        if (
          binding
          && !existing.bindings.some((entry) => entry.bindingType === binding.bindingType && entry.targetId === binding.targetId)
        ) {
          existing.bindings.push(binding);
        }
        continue;
      }

      groups.set(knowledgeBaseId, {
        knowledgeBaseId,
        knowledgeBaseName,
        knowledgeBaseSlug,
        description: this.buildManagedKnowledgeBaseDescription(brandName, knowledgeBaseName),
        files: [
          {
            ...item,
            knowledgeBaseId,
            knowledgeBaseName,
            knowledgeBaseSlug,
          },
        ],
        retrievalConfig,
        bindings: binding ? [binding] : [this.buildDefaultManagedKnowledgeBinding()],
      });
    }

    return Array.from(groups.values());
  }

  private extractBrandAssetStoredFileName(fileUrl?: string) {
    const raw = String(fileUrl || "").trim();
    if (!raw) {
      return "";
    }
    try {
      const parsed = new URL(raw);
      const lastSegment = parsed.pathname.split("/").pop() || "";
      return this.sanitizeStoredFileName(decodeURIComponent(lastSegment));
    } catch {
      const normalized = raw.split("#")[0]?.split("?")[0] || "";
      const lastSegment = normalized.split("/").pop() || normalized.split("\\").pop() || "";
      try {
        return this.sanitizeStoredFileName(decodeURIComponent(lastSegment));
      } catch {
        return this.sanitizeStoredFileName(lastSegment);
      }
    }
  }

  private mapBusinessAssetToKnowledgeFile(
    knowledgeBaseId: string,
    item: CreateAssetPayload["items"][number],
    uploadedAt: string,
    index: number,
  ) {
    const storedFileName = this.extractBrandAssetStoredFileName(item.fileUrl);
    const fileName = (item.title || storedFileName || item.fileUrl || `企业知识资料 ${index + 1}`).trim();
    const fileType = this.inferKnowledgeFileType(storedFileName, item.fileUrl, item.title);
    return {
      id: createId("kbf"),
      knowledgeBaseId,
      fileName,
      fileType,
      sourceName: `企业知识库桥接 / ${item.sourceName?.trim() || "品牌增长工作台"}`,
      chunkCount: 0,
      status: "PENDING" as const,
      uploadedAt,
    };
  }

  private inferKnowledgeFileType(...candidates: Array<string | undefined>): "PDF" | "DOCX" | "XLSX" | "MD" | "LINK" {
    for (const candidate of candidates) {
      const target = String(candidate || "").trim().toLowerCase();
      if (!target) {
        continue;
      }
      if (target.endsWith(".pdf")) {
        return "PDF";
      }
      if (target.endsWith(".doc") || target.endsWith(".docx")) {
        return "DOCX";
      }
      if (target.endsWith(".xls") || target.endsWith(".xlsx") || target.endsWith(".csv")) {
        return "XLSX";
      }
      if (target.endsWith(".md") || target.endsWith(".markdown") || target.endsWith(".txt")) {
        return "MD";
      }
    }
    return "LINK";
  }

  private async syncBusinessAssetsToKnowledgeBaseInDatabase(
    brandId: string,
    items: CreateAssetPayload["items"],
  ): Promise<string[]> {
    if (!(await this.canUseKnowledgeBridgeStorage())) {
      return [];
    }

    const brand = await this.prismaService.brand.findUnique({
      where: { id: brandId },
      select: { brandName: true },
    });
    if (!brand) {
      return [];
    }

    const now = new Date();
    const uploadedAt = now.toISOString();
    const groups = this.collectManagedKnowledgeSpaceGroups(brandId, brand.brandName, items);
    const managedPrefix = `${BRAND_BUSINESS_ASSETS_KB_PREFIX}${brandId}`;
    const existingManagedKnowledgeBases = await this.prismaService.knowledgeBase.findMany({
      where: {
        id: {
          startsWith: managedPrefix,
        },
      },
      select: { id: true },
    });
    const nextKnowledgeBaseIds = groups.map((item) => item.knowledgeBaseId);
    const obsoleteKnowledgeBaseIds = existingManagedKnowledgeBases
      .map((item) => item.id)
      .filter((item) => !nextKnowledgeBaseIds.includes(item));
    if (obsoleteKnowledgeBaseIds.length) {
      await this.prismaService.knowledgeBase.deleteMany({
        where: { id: { in: obsoleteKnowledgeBaseIds } },
      });
    }

    for (const group of groups) {
      await this.prismaService.knowledgeBase.upsert({
        where: { id: group.knowledgeBaseId },
        update: {
          name: group.knowledgeBaseName,
          slug: group.knowledgeBaseSlug,
          sourceType: "OSS",
          status: group.files.length ? "ACTIVE" : "DRAFT",
          syncStatus: "IDLE",
          documentCount: group.files.length,
          chunkCount: 0,
          description: group.description,
          updatedAt: now,
        },
        create: {
          id: group.knowledgeBaseId,
          name: group.knowledgeBaseName,
          slug: group.knowledgeBaseSlug,
          sourceType: "OSS",
          status: group.files.length ? "ACTIVE" : "DRAFT",
          syncStatus: "IDLE",
          documentCount: group.files.length,
          chunkCount: 0,
          description: group.description,
          createdAt: now,
          updatedAt: now,
        },
      });

      await this.prismaService.knowledgeRetrievalConfig.upsert({
        where: { knowledgeBaseId: group.knowledgeBaseId },
        update: {
          defaultTopK: group.retrievalConfig.defaultTopK,
          recallMode: group.retrievalConfig.recallMode,
          rerankEnabled: group.retrievalConfig.rerankEnabled,
          retrievalThreshold: group.retrievalConfig.retrievalThreshold ?? null,
          updatedAt: now,
        },
        create: {
          id: createId("kbrc"),
          knowledgeBaseId: group.knowledgeBaseId,
          defaultTopK: group.retrievalConfig.defaultTopK,
          recallMode: group.retrievalConfig.recallMode,
          rerankEnabled: group.retrievalConfig.rerankEnabled,
          retrievalThreshold: group.retrievalConfig.retrievalThreshold ?? null,
          createdAt: now,
          updatedAt: now,
        },
      });

      await this.prismaService.knowledgeBinding.deleteMany({
        where: { knowledgeBaseId: group.knowledgeBaseId },
      });
      if (group.bindings.length) {
        await this.prismaService.knowledgeBinding.createMany({
          data: group.bindings.map((binding) => ({
            id: createId("kbb"),
            knowledgeBaseId: group.knowledgeBaseId,
            bindingType: binding.bindingType,
            targetId: binding.targetId,
            targetKey: binding.targetKey ?? null,
            targetName: binding.targetName ?? null,
            priority: binding.priority,
            retrievalMode: binding.retrievalMode,
            isRequired: binding.isRequired,
            enabled: binding.enabled,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }

      await this.prismaService.knowledgeBaseFile.deleteMany({
        where: { knowledgeBaseId: group.knowledgeBaseId },
      });
      if (group.files.length) {
        await this.prismaService.knowledgeBaseFile.createMany({
          data: group.files.map((item, index) => {
            const file = this.mapBusinessAssetToKnowledgeFile(group.knowledgeBaseId, item, uploadedAt, index);
            return {
              id: file.id,
              knowledgeBaseId: file.knowledgeBaseId,
              fileName: file.fileName,
              fileType: file.fileType,
              sourceName: file.sourceName,
              chunkCount: file.chunkCount,
              status: file.status,
              uploadedAt: new Date(file.uploadedAt),
            };
          }),
        });
      }
    }

    return nextKnowledgeBaseIds;
  }

  private syncBusinessAssetsToKnowledgeBaseFromMock(
    brandId: string,
    items: CreateAssetPayload["items"],
  ) {
    const brand = this.getBrand(brandId);
    const uploadedAt = new Date().toISOString();
    const groups = this.collectManagedKnowledgeSpaceGroups(brandId, brand.brandName, items);
    const managedPrefix = `${BRAND_BUSINESS_ASSETS_KB_PREFIX}${brandId}`;
    const nextKnowledgeBaseIds = new Set(groups.map((item) => item.knowledgeBaseId));

    database.knowledgeBases = database.knowledgeBases.filter(
      (item) => !(item.id.startsWith(managedPrefix) && !nextKnowledgeBaseIds.has(item.id)),
    );
    database.knowledgeBindings = database.knowledgeBindings.filter(
      (item) => !(item.knowledgeBaseId.startsWith(managedPrefix) && !nextKnowledgeBaseIds.has(item.knowledgeBaseId)),
    );
    database.knowledgeBaseFiles = database.knowledgeBaseFiles.filter(
      (item) => !(item.knowledgeBaseId.startsWith(managedPrefix) && !nextKnowledgeBaseIds.has(item.knowledgeBaseId)),
    );
    database.knowledgeRetrievalConfigs = database.knowledgeRetrievalConfigs.filter(
      (item) => !(item.knowledgeBaseId.startsWith(managedPrefix) && !nextKnowledgeBaseIds.has(item.knowledgeBaseId)),
    );

    for (const group of groups) {
      const knowledgeBaseRecord: KnowledgeBaseRecord = {
        id: group.knowledgeBaseId,
        name: group.knowledgeBaseName,
        slug: group.knowledgeBaseSlug,
        sourceType: "OSS",
        status: group.files.length ? "ACTIVE" : "DRAFT",
        syncStatus: "IDLE",
        documentCount: group.files.length,
        chunkCount: 0,
        description: group.description,
        updatedAt: uploadedAt,
      };
      const existingIndex = database.knowledgeBases.findIndex((item) => item.id === group.knowledgeBaseId);
      if (existingIndex >= 0) {
        database.knowledgeBases[existingIndex] = {
          ...database.knowledgeBases[existingIndex],
          ...knowledgeBaseRecord,
        };
      } else {
        database.knowledgeBases.unshift(knowledgeBaseRecord);
      }

      const retrievalConfigRecord: KnowledgeRetrievalConfigRecord = {
        id:
          database.knowledgeRetrievalConfigs.find((item) => item.knowledgeBaseId === group.knowledgeBaseId)?.id
          || createId("kbrc"),
        knowledgeBaseId: group.knowledgeBaseId,
        defaultTopK: group.retrievalConfig.defaultTopK,
        recallMode: group.retrievalConfig.recallMode,
        rerankEnabled: group.retrievalConfig.rerankEnabled,
        retrievalThreshold: group.retrievalConfig.retrievalThreshold,
        chunkSize: undefined,
        chunkOverlap: undefined,
        rerankModelName: undefined,
        createdAt:
          database.knowledgeRetrievalConfigs.find((item) => item.knowledgeBaseId === group.knowledgeBaseId)?.createdAt
          || uploadedAt,
        updatedAt: uploadedAt,
      };
      database.knowledgeRetrievalConfigs = database.knowledgeRetrievalConfigs.filter(
        (item) => item.knowledgeBaseId !== group.knowledgeBaseId,
      );
      database.knowledgeRetrievalConfigs.unshift(retrievalConfigRecord);

      database.knowledgeBindings = database.knowledgeBindings.filter((item) => item.knowledgeBaseId !== group.knowledgeBaseId);
      database.knowledgeBindings.unshift(
        ...group.bindings.map((binding) => ({
          id: createId("kbb"),
          knowledgeBaseId: group.knowledgeBaseId,
          bindingType: binding.bindingType,
          targetId: binding.targetId,
          targetKey: binding.targetKey,
          targetName: binding.targetName,
          priority: binding.priority,
          retrievalMode: binding.retrievalMode,
          isRequired: binding.isRequired,
          enabled: binding.enabled,
          createdAt: uploadedAt,
          updatedAt: uploadedAt,
        }) satisfies KnowledgeBindingRecord),
      );

      database.knowledgeBaseFiles = database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId !== group.knowledgeBaseId);
      database.knowledgeBaseFiles.unshift(
        ...group.files.map((item, index) => this.mapBusinessAssetToKnowledgeFile(group.knowledgeBaseId, item, uploadedAt, index)),
      );
    }
  }

  private replaceAccounts(
    target: "platformAccounts" | "competitorAccounts",
    brandId: string,
    accounts: ReplaceAccountsPayload["accounts"],
  ) {
    this.getBrand(brandId);
    database[target] = database[target].filter((item) => item.brandId !== brandId);

    const rows = accounts.map((account) => ({
      id: account.id ?? createId(target === "platformAccounts" ? "acc" : "cmp"),
      brandId,
      platform: account.platform,
      accountName: account.accountName,
      accountLink: account.accountLink,
    }));

    database[target].push(...rows);
    return rows;
  }

  private replaceAssets(
    brandId: string,
    category: "INDUSTRY_REPORT" | "BUSINESS_DATA",
    items: CreateAssetPayload["items"],
  ) {
    this.getBrand(brandId);
    database.assets = database.assets.filter(
      (item) => !(item.brandId === brandId && item.category === category)
    );

    const rows = items.map((item) => ({
      id: item.id ?? createId("ast"),
      brandId,
      category,
      title: item.title,
      description: item.description,
      sourceName: item.sourceName,
      fileUrl: item.fileUrl,
    }));

    database.assets.push(...rows);
    return rows;
  }

  private buildStepsFromCollections({
    products,
    survey,
    platformAccounts,
    competitorAccounts,
    industryFeeds,
    businessAssets,
  }: {
    products: Array<unknown>;
    survey: Array<unknown>;
    platformAccounts: Array<unknown>;
    competitorAccounts: Array<unknown>;
    industryFeeds: Array<unknown>;
    businessAssets: Array<unknown>;
  }) {
    return [
      {
        key: "background",
        name: "品牌背景资料",
        status: "ready",
        description: "品牌名称、行业、门店数量、品牌介绍与企业介绍。",
      },
      {
        key: "products",
        name: "产品资料库",
        status: products.length > 0 ? "ready" : "pending",
        description: "一行一个产品，沉淀产品定位、价格和使用场景。",
      },
      {
        key: "survey",
        name: "品牌运营情况调研",
        status: survey.length >= 4 ? "in_progress" : "pending",
        description: "围绕人货场资制度与业务诊断的结构化调研。",
      },
      {
        key: "industryFeeds",
        name: "第三方数据投喂",
        status: industryFeeds.length > 0 ? "ready" : "pending",
        description: "行业报告、市场分析等外部信息输入。",
      },
      {
        key: "businessAssets",
        name: "企业知识库投喂",
        status: businessAssets.length > 0 ? "ready" : "pending",
        description: "经营报表、业务资料与内部知识输入，为增长分析与知识沉淀做准备。",
      },
    ];
  }

  private async ensureBrandExistsInDatabase(id: string) {
    const brand = await this.prismaService.brand.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }

  private async ensureProductExistsInDatabase(brandId: string, productId: string) {
    const product = await this.prismaService.product.findFirst({
      where: {
        id: productId,
        brandId,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException("产品不存在");
    }
  }

  private async getDefaultUserId() {
    const user = await this.prismaService.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("当前数据库中不存在可绑定的用户");
    }

    return user.id;
  }

  private async ensureBrandExistsInMockOrDatabase(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);
      return;
    }

    this.getBrand(id);
  }

  private toDecimal(value: number) {
    return new Prisma.Decimal(value);
  }

  private buildBrandProductImageStorageKey(brandId: string, fileName: string) {
    return `brands/${brandId}/product-images/${fileName}`;
  }

  private buildBrandAssetFileStorageKey(brandId: string, fileName: string) {
    return `brands/${brandId}/asset-files/${fileName}`;
  }

  private resolveServerBaseUrl() {
    return this.appConfigService.getServerBaseUrl();
  }

  private resolveImageExtension(fileName: string, contentType: string) {
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

  private resolveStoredExtension(fileName: string) {
    const currentExtension = extname(fileName).toLowerCase();
    return currentExtension || ".bin";
  }

  private sanitizeStoredFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "");
  }

  private resolveImageContentType(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    switch (extension) {
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".gif":
        return "image/gif";
      case ".jpeg":
      case ".jpg":
      default:
        return "image/jpeg";
    }
  }

  private resolveFileContentType(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    switch (extension) {
      case ".pdf":
        return "application/pdf";
      case ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".xls":
        return "application/vnd.ms-excel";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".doc":
        return "application/msword";
      case ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      case ".ppt":
        return "application/vnd.ms-powerpoint";
      case ".csv":
        return "text/csv; charset=utf-8";
      case ".txt":
        return "text/plain; charset=utf-8";
      case ".zip":
        return "application/zip";
      case ".rar":
        return "application/vnd.rar";
      default:
        return "application/octet-stream";
    }
  }

  private mapProduct(item: {
    id: string;
    productName: string;
    productType: string | null;
    price: Prisma.Decimal | null;
    productPositioning?: string | null;
    targetAudience?: string | null;
    painPoint?: string | null;
    usageScenario: string | null;
    differentiators?: string | null;
    marketPosition?: string | null;
    detailDescription?: string | null;
    imageUrl?: string | null;
  }) {
    return {
      id: item.id,
      productName: item.productName,
      productType: item.productType ?? "",
      price: item.price ? Number(item.price) : 0,
      productPositioning: item.productPositioning ?? "",
      targetAudience: item.targetAudience ?? "",
      painPoint: item.painPoint ?? "",
      usageScenario: item.usageScenario ?? "",
      differentiators: item.differentiators ?? "",
      marketPosition: item.marketPosition ?? "",
      detailDescription: item.detailDescription ?? "",
      imageUrl: item.imageUrl ?? "",
    };
  }

  private mapAccount(item: {
    id: string;
    platform: PlatformType;
    accountName: string | null;
    accountLink: string;
  }) {
    return {
      id: item.id,
      platform: item.platform,
      accountName: item.accountName ?? "",
      accountLink: item.accountLink,
    };
  }

  private parseSurveyAnswers(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;

      return {
        id: typeof row.id === "string" ? row.id : `sur_db_${index + 1}`,
        key: typeof row.key === "string" ? row.key : `field_${index + 1}`,
        label: typeof row.label === "string" ? row.label : `字段 ${index + 1}`,
        value: typeof row.value === "string" ? row.value : "",
      };
    });
  }

  private extractSourceName(value: Prisma.JsonValue | null | undefined) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return "";
    }

    const sourceName = (value as Record<string, unknown>).sourceName;
    return typeof sourceName === "string" ? sourceName : "";
  }

  private mapFeishuBinding(
    asset:
      | {
          id: string;
          fileUrl: string | null;
          metadataJson: Prisma.JsonValue | null;
          createdAt: Date;
          updatedAt: Date;
        }
      | null,
  ) {
    if (!asset) {
      return null;
    }

    const metadata = this.readObject(asset.metadataJson);
    return {
      id: asset.id,
      title: this.readString(metadata, "title") || "飞书多维表格副本",
      wikiUrl: asset.fileUrl ?? this.readString(metadata, "wikiUrl") ?? "",
      wikiToken: this.readString(metadata, "wikiToken") ?? "",
      host: this.readString(metadata, "host") ?? "",
      tableId: this.readString(metadata, "tableId") ?? "",
      viewId: this.readString(metadata, "viewId") ?? "",
      baseToken: this.readString(metadata, "baseToken") ?? "",
      templateUrl: this.readString(metadata, "templateUrl") ?? "",
      syncStatus: this.readString(metadata, "syncStatus") ?? "IDLE",
      lastError: this.readString(metadata, "lastError") ?? "",
      lastBoundAt: this.readString(metadata, "lastBoundAt") ?? asset.updatedAt.toISOString(),
      lastSyncAt: this.readString(metadata, "lastSyncAt") ?? "",
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private mapFeishuBindingFromMock(
    asset:
      | {
          id: string;
          fileUrl?: string;
          metadataJson?: Record<string, unknown>;
        }
      | undefined,
  ) {
    if (!asset) {
      return null;
    }

    const metadata = asset.metadataJson ?? {};
    return {
      id: asset.id,
      title: this.readString(metadata, "title") || "飞书多维表格副本",
      wikiUrl: asset.fileUrl ?? this.readString(metadata, "wikiUrl") ?? "",
      wikiToken: this.readString(metadata, "wikiToken") ?? "",
      host: this.readString(metadata, "host") ?? "",
      tableId: this.readString(metadata, "tableId") ?? "",
      viewId: this.readString(metadata, "viewId") ?? "",
      baseToken: this.readString(metadata, "baseToken") ?? "",
      templateUrl: this.readString(metadata, "templateUrl") ?? "",
      syncStatus: this.readString(metadata, "syncStatus") ?? "IDLE",
      lastError: this.readString(metadata, "lastError") ?? "",
      lastBoundAt: this.readString(metadata, "lastBoundAt") ?? "",
      lastSyncAt: this.readString(metadata, "lastSyncAt") ?? "",
      createdAt: this.readString(metadata, "createdAt") ?? "",
      updatedAt: this.readString(metadata, "updatedAt") ?? "",
    };
  }

  private parseFeishuBindingUrl(url: string) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new NotFoundException("飞书副本链接格式不正确");
    }

    const wikiMatch = parsedUrl.pathname.match(/\/wiki\/([^/?#]+)/);
    const baseMatch = parsedUrl.pathname.match(/\/base\/([^/?#]+)/);
    if (!wikiMatch?.[1] && !baseMatch?.[1]) {
      throw new NotFoundException("当前仅支持绑定飞书 wiki 或多维表格链接");
    }

    return {
      host: parsedUrl.host,
      wikiToken: wikiMatch?.[1] ?? "",
      baseToken: baseMatch?.[1] ?? "",
      tableId: parsedUrl.searchParams.get("table") ?? "",
      viewId: parsedUrl.searchParams.get("view") ?? "",
    };
  }

  private buildFeishuBindingMetadata(payload: FeishuBindingPayload, parsed: ReturnType<BrandsService["parseFeishuBindingUrl"]>) {
    return {
      kind: FEISHU_BINDING_KIND,
      title: payload.title || "飞书多维表格副本",
      wikiUrl: payload.wikiUrl,
      wikiToken: parsed.wikiToken,
      host: parsed.host,
      tableId: payload.tableId || parsed.tableId,
      viewId: payload.viewId || parsed.viewId,
      baseToken: payload.baseToken || parsed.baseToken || "",
      templateUrl: payload.templateUrl || "",
      syncStatus: "IDLE",
      lastError: "",
      lastBoundAt: new Date().toISOString(),
      lastSyncAt: "",
    };
  }

  private isFeishuBindingMetadata(value: Prisma.JsonValue | Record<string, unknown> | null | undefined) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return false;
    }

    return (value as Record<string, unknown>).kind === FEISHU_BINDING_KIND;
  }

  private readObject(value: Prisma.JsonValue | Record<string, unknown> | null | undefined | unknown) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private readString(value: Record<string, unknown>, key: string) {
    const nextValue = value[key];
    return typeof nextValue === "string" ? nextValue : undefined;
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

  private async runLarkCliJson(
    args: string[],
    options?: {
      timeoutMs?: number;
      allowPartialJsonOnError?: boolean;
    },
  ) {
    try {
      const cliHome = this.resolveLarkCliHomeDir();
      const env = {
        ...process.env,
        HOME: cliHome,
        USERPROFILE: cliHome,
      };
      const result = process.platform === "win32"
        ? await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-Command", `& '${this.resolveLarkCliCommand()}' ${args.map((item) => this.escapePowerShellArg(item)).join(" ")}`],
            {
              encoding: "buffer",
              env,
              maxBuffer: 8 * 1024 * 1024,
              timeout: options?.timeoutMs,
            },
          )
        : await execFileAsync(this.resolveLarkCliCommand(), args, {
            encoding: "buffer",
            env,
            maxBuffer: 8 * 1024 * 1024,
            timeout: options?.timeoutMs,
          });
      const text = this.decodeCliOutput(result.stdout);
      return text ? (JSON.parse(text) as unknown) : {};
    } catch (error) {
      const stdout = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stdout" in error ? (error as { stdout?: unknown }).stdout : undefined,
      );
      const stderr = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stderr" in error ? (error as { stderr?: unknown }).stderr : undefined,
      );
      if (options?.allowPartialJsonOnError) {
        const partialPayload = this.tryParseFirstJsonObject(stdout);
        if (partialPayload) {
          return partialPayload;
        }
      }
      const message = stderr.trim() || stdout.trim() || (error instanceof Error ? error.message : "lark-cli 执行失败");
      throw new ServiceUnavailableException(message);
    }
  }

  private decodeCliOutput(stdout: Buffer | string | null | undefined) {
    if (!stdout) {
      return "";
    }
    if (typeof stdout === "string") {
      return stdout.trim();
    }
    const utf8Text = stdout.toString("utf8").trim();
    if (process.platform === "win32") {
      if (!utf8Text.includes("�")) {
        return utf8Text;
      }
      try {
        const gbText = new TextDecoder("gb18030").decode(stdout).trim();
        return gbText || utf8Text;
      } catch {
        return utf8Text;
      }
    }
    return utf8Text;
  }

  private decodeUnknownCliStream(value: unknown) {
    if (!value) {
      return "";
    }
    if (Buffer.isBuffer(value) || typeof value === "string") {
      return this.decodeCliOutput(value);
    }
    return String(value);
  }

  private tryParseFirstJsonObject(value: string) {
    const candidate = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item.startsWith("{") && item.endsWith("}"));
    if (!candidate) {
      return null;
    }
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }

  private escapePowerShellArg(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
  }

  private resolveLarkCliCommand() {
    if (process.platform === "win32") {
      const appData = process.env.APPDATA || process.env.USERPROFILE;
      if (appData) {
        const baseDir = appData.endsWith("\\Roaming") ? `${appData}\\npm` : `${appData}\\Roaming\\npm`;
        return `${baseDir}\\lark-cli.cmd`;
      }
      return "lark-cli.cmd";
    }

    return "lark-cli";
  }

  private resolveLarkCliHomeDir() {
    const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, ".lark-cli", "config.json"))) {
        return candidate;
      }
    }

    const fromUserProfile = process.env.USERPROFILE ? resolve(process.env.USERPROFILE) : "";
    if (fromUserProfile && existsSync(join(fromUserProfile, ".lark-cli", "config.json"))) {
      return fromUserProfile;
    }

    return process.cwd();
  }

  private getBrand(id: string) {
    const brand = database.brands.find((item) => item.id === id);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    return brand;
  }
}

function compareBrandMemberRole(left: string, right: string) {
  const order: Record<string, number> = {
    ADMIN: 0,
    STAFF: 1,
    TALENT: 2,
    OWNER: 0,
    EDITOR: 1,
    OPERATOR: 1,
    VIEWER: 2,
  };
  return (order[left] ?? 99) - (order[right] ?? 99);
}

function canManageBrandMembers(role: string) {
  return normalizeBrandCollaboratorRole(role) === "ADMIN";
}

function parseCollaboratorBrandRole(role?: string): BrandMemberRole {
  switch (role) {
    case BrandMemberRole.ADMIN:
      return BrandMemberRole.ADMIN;
    case "TALENT":
      return BrandMemberRole.VIEWER;
    case "STAFF":
    case BrandMemberRole.EDITOR:
    case BrandMemberRole.OPERATOR:
    default:
      return BrandMemberRole.EDITOR;
  }
}

function parseManageableBrandStatus(status?: string): BrandMemberStatus {
  switch (status) {
    case BrandMemberStatus.ACTIVE:
      return BrandMemberStatus.ACTIVE;
    case BrandMemberStatus.DISABLED:
      return BrandMemberStatus.DISABLED;
    case BrandMemberStatus.REMOVED:
      return BrandMemberStatus.REMOVED;
    default:
      return BrandMemberStatus.ACTIVE;
  }
}

function normalizeInviteExpiryDays(days?: number) {
  if (!days || Number.isNaN(days)) {
    return 7;
  }
  return Math.min(Math.max(Math.round(days), 1), 30);
}
